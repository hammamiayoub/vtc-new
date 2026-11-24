/*
  # Contrôle serveur du prix et de la distance d'une réservation — version 2

  REMPLACE 20261124110000_booking_price_floor.sql (à ne plus appliquer).

  POURQUOI UNE V2
    La v1 comparait le prix à la grille de la version déclarée par la réservation, ou à la grille historique v1 si
    aucune version n'était envoyée. Or ni le site ni l'app mobile n'envoient pricing_grid_version : le serveur
    appliquait donc la grille v1 (1,53 / 1,98 TND par km), alors que les clients calculent avec la grille active v2
    (1 / 0,90 TND par km). Une réservation Beni Khalled -> Tunis à 58 TND (v2) était refusée (plancher v1 = 59 TND).
    Cela bloquait toute réservation de plus de quelques kilomètres.

  RÈGLES (création d'une réservation par un client ou un chauffeur ; pas pour l'administration ni les fonctions serveur)
    1. distance : la distance déclarée ne peut pas être inférieure à 60 % de la distance à vol d'oiseau.
    2. prix : le prix ne peut pas être inférieur à 70 % du plancher, moins 3 TND de tolérance. Le plancher est calculé
       sur la distance à vol d'oiseau, sans prise en charge, supplément ni coefficient véhicule.
       - version de grille déclarée : plancher de CETTE grille ;
       - aucune version (cas actuel du site et de l'app) : plancher de la grille la MOINS CHÈRE parmi toutes
         les versions, de sorte qu'une grille plus ancienne ou plus récente ne puisse jamais refuser une réservation.
    Les contrôles ne s'appliquent que si les coordonnées sont fournies.

  Vise uniquement la fraude grossière (prix quasi nul). Voir scripts/backtest-booking-price-floor.sql pour mesurer,
  AVANT application, le nombre de réservations existantes qui auraient été refusées.
  Retour arrière : supabase/rollbacks/20261126130000_booking_price_floor_v2.down.sql
*/

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

-- Plancher d'une configuration de grille : tranches kilométriques progressives, au moins le prix minimum
CREATE OR REPLACE FUNCTION public.pricing_grid_floor_tnd(p_config jsonb, p_distance_km double precision)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  tier jsonb;
  prev double precision := 0;
  seg_end double precision;
  up double precision;
  total double precision := 0;
BEGIN
  IF p_config IS NULL OR p_distance_km IS NULL OR p_distance_km <= 0 THEN
    RETURN 0;
  END IF;

  FOR tier IN SELECT * FROM jsonb_array_elements(p_config->'km_tiers') LOOP
    EXIT WHEN p_distance_km <= prev;
    up := NULLIF(tier->>'up_to_km', '')::double precision;  -- null = sans plafond
    seg_end := CASE WHEN up IS NULL THEN p_distance_km ELSE LEAST(p_distance_km, up) END;
    total := total + (seg_end - prev) * COALESCE((tier->>'rate_per_km')::double precision, 0);
    prev := COALESCE(up, p_distance_km);
  END LOOP;

  RETURN GREATEST(COALESCE((p_config->>'minimum_price_tnd')::double precision, 0), total);
END;
$$;

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
  v_floor double precision;
BEGIN
  IF p_distance_km IS NULL OR p_distance_km <= 0 THEN
    RETURN 0;
  END IF;

  -- Version déclarée : sa grille. Sinon (ou version inconnue) : la grille la moins chère de toutes les versions.
  SELECT min(public.pricing_grid_floor_tnd(config, p_distance_km)) INTO v_floor
  FROM public.pricing_config
  WHERE p_version IS NOT NULL AND version = p_version;

  IF v_floor IS NULL THEN
    SELECT min(public.pricing_grid_floor_tnd(config, p_distance_km)) INTO v_floor FROM public.pricing_config;
  END IF;

  RETURN COALESCE(v_floor, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.pricing_grid_floor_tnd(jsonb, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pricing_grid_floor_tnd(jsonb, double precision) TO authenticated, service_role;
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

      IF NEW.distance_km IS NOT NULL AND NEW.distance_km > 0 AND NEW.distance_km < v_straight * 0.6 THEN
        RAISE EXCEPTION 'invalid_booking_distance: distance incohérente avec les adresses.'
          USING ERRCODE = '22023';
      END IF;

      v_floor := public.pricing_min_plausible_price_tnd(NEW.pricing_grid_version, v_straight);
      IF NEW.price_tnd < v_floor * 0.7 - 3 THEN
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
