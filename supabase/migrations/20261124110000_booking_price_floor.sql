/*
  # ⚠️ REMPLACÉE par 20261126130000_booking_price_floor_v2.sql — NE PLUS APPLIQUER CETTE VERSION.
  #    (Elle refusait des réservations légitimes : voir l'en-tête de la v2.)

  # Contrôle serveur du prix et de la distance d'une réservation

  PROBLÈME
    Le prix (price_tnd) et la distance (distance_km) sont calculés par l'application puis envoyés tels quels :
    un utilisateur qui rejoue la requête peut les remplacer par n'importe quelle valeur (prix à 1 TND).
    Le serveur ne peut pas recalculer exactement le prix (supplément nuit / week-end, prise en charge variable
    selon la position du chauffeur, arrondi…), ni la distance routière (Google). Il peut en revanche vérifier
    des BORNES BASSES qui ne dépendent d'aucune de ces inconnues.

  RÈGLES (à la création d'une réservation par un client ou un chauffeur — pas pour l'administration,
  ni pour les fonctions serveur comme le dispatch)
    1. distance : la distance déclarée ne peut pas être inférieure à 80 % de la distance à vol d'oiseau entre
       le départ et l'arrivée (une route est toujours au moins aussi longue que la ligne droite).
    2. prix : le prix ne peut pas être inférieur à 85 % de la grille officielle appliquée à la distance à vol
       d'oiseau (grille de la version déclarée par la réservation, grille historique si absente), moins 3 TND
       de tolérance pour l'arrondi. Ni supplément, ni coefficient véhicule, ni prise en charge ne sont
       comptés : seule la borne minimale est contrôlée, donc aucune réservation légitime n'est refusée.
    Les contrôles ne s'appliquent que si les coordonnées sont fournies.

  NE CONTRÔLE PAS
    Un prix surestimé, ni un prix légèrement sous-évalué par rapport à la formule exacte : la fraude visée
    (prix quasi nul) est bloquée ; un calcul exact côté serveur demanderait un appel au service d'itinéraire.

  Remplace la fonction guard_booking_columns de la migration 20261124100000 (mêmes règles + contrôle du prix).
  Retour arrière : supabase/rollbacks/20261124110000_booking_price_floor.down.sql
*/

-- Distance à vol d'oiseau (km)
CREATE OR REPLACE FUNCTION public.haversine_km(
  p_lat1 double precision, p_lon1 double precision,
  p_lat2 double precision, p_lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 2 * 6371 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lon2 - p_lon1) / 2), 2)
  ));
$$;

-- Prix minimal plausible pour une distance : grille kilométrique progressive de la version donnée,
-- plafonnée par le prix minimum de la grille (sans prise en charge, supplément ni coefficient véhicule).
CREATE OR REPLACE FUNCTION public.pricing_min_plausible_price_tnd(
  p_version smallint,
  p_distance_km double precision
)
RETURNS double precision
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  c jsonb;
  tier jsonb;
  prev double precision := 0;
  seg_end double precision;
  up double precision;
  total double precision := 0;
BEGIN
  SELECT config INTO c FROM public.pricing_config WHERE version = COALESCE(p_version, 1);
  IF c IS NULL THEN
    SELECT config INTO c FROM public.pricing_config WHERE version = 1;
  END IF;
  IF c IS NULL OR p_distance_km IS NULL OR p_distance_km <= 0 THEN
    RETURN 0;
  END IF;

  FOR tier IN SELECT * FROM jsonb_array_elements(c->'km_tiers') LOOP
    EXIT WHEN p_distance_km <= prev;
    up := NULLIF(tier->>'up_to_km', '')::double precision;  -- null = sans plafond
    seg_end := CASE WHEN up IS NULL THEN p_distance_km ELSE LEAST(p_distance_km, up) END;
    total := total + (seg_end - prev) * (tier->>'rate_per_km')::double precision;
    prev := COALESCE(up, p_distance_km);
  END LOOP;

  RETURN GREATEST(COALESCE((c->>'minimum_price_tnd')::double precision, 0), total);
END;
$$;

REVOKE ALL ON FUNCTION public.pricing_min_plausible_price_tnd(smallint, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pricing_min_plausible_price_tnd(smallint, double precision)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_booking_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_straight double precision;
  v_floor double precision;
BEGIN
  -- Seuls les rôles applicatifs sont contrôlés : postgres, service_role et les fonctions SECURITY DEFINER
  -- (acceptation, dispatch…) passent.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = v_uid) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL AND NEW.status NOT IN ('pending', 'searching') THEN
      RAISE EXCEPTION 'forbidden_booking_status: une réservation démarre « pending » ou « searching ».'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.price_tnd IS NULL OR NEW.price_tnd <= 0 THEN
      RAISE EXCEPTION 'invalid_booking_price: prix invalide.' USING ERRCODE = '22023';
    END IF;
    IF NEW.accepted_at IS NOT NULL OR NEW.tracking_token IS NOT NULL
       OR NEW.pickup_time IS NOT NULL OR NEW.completion_time IS NOT NULL THEN
      RAISE EXCEPTION 'forbidden_booking_columns: colonnes gérées par le serveur.' USING ERRCODE = '42501';
    END IF;

    -- Bornes basses de distance et de prix (si les coordonnées sont fournies)
    IF NEW.pickup_latitude IS NOT NULL AND NEW.pickup_longitude IS NOT NULL
       AND NEW.destination_latitude IS NOT NULL AND NEW.destination_longitude IS NOT NULL THEN
      v_straight := public.haversine_km(
        NEW.pickup_latitude, NEW.pickup_longitude, NEW.destination_latitude, NEW.destination_longitude);

      IF NEW.distance_km IS NOT NULL AND NEW.distance_km > 0 AND NEW.distance_km < v_straight * 0.8 THEN
        RAISE EXCEPTION 'invalid_booking_distance: distance incohérente avec les adresses.'
          USING ERRCODE = '22023';
      END IF;

      v_floor := public.pricing_min_plausible_price_tnd(NEW.pricing_grid_version, v_straight);
      IF NEW.price_tnd < v_floor * 0.85 - 3 THEN
        RAISE EXCEPTION 'invalid_booking_price: prix inférieur au tarif minimal pour ce trajet.'
          USING ERRCODE = '22023';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE : colonnes que personne (hors administration) ne modifie à la main
  IF NEW.price_tnd IS DISTINCT FROM OLD.price_tnd
     OR NEW.distance_km IS DISTINCT FROM OLD.distance_km
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.pickup_address IS DISTINCT FROM OLD.pickup_address
     OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
     OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
    RAISE EXCEPTION 'forbidden_booking_columns: prix, distance, client, adresses et horaire ne sont pas modifiables.'
      USING ERRCODE = '42501';
  END IF;

  -- Le client ne peut qu'annuler : ni changer de chauffeur, ni se déclarer accepté / terminé
  IF v_uid IS NOT NULL AND v_uid = OLD.client_id AND v_uid IS DISTINCT FROM OLD.driver_id THEN
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id
       OR NEW.tracking_token IS DISTINCT FROM OLD.tracking_token
       OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       OR NEW.pickup_time IS DISTINCT FROM OLD.pickup_time
       OR NEW.completion_time IS DISTINCT FROM OLD.completion_time THEN
      RAISE EXCEPTION 'forbidden_booking_columns: modification réservée au chauffeur ou au serveur.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'forbidden_booking_status: un client ne peut qu''annuler sa réservation.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
