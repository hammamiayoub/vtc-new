/*
  # Durcissement de sécurité (résultats de l'audit du 2026-11-24)

  À TESTER SUR UN ENVIRONNEMENT DE TEST AVANT LA PRODUCTION. Retour arrière :
  supabase/rollbacks/20261124100000_security_hardening.down.sql

  Rappel : la clé « anon » et le jeton d'un utilisateur sont visibles dans les traces réseau. Seuls le RLS,
  les droits d'exécution et les contrôles dans les fonctions protègent la base.

  CORRIGE
    1. Lecture de TOUTE la table clients / drivers par n'importe qui (politiques « anon_can_check_*_exists »
       USING (true) pour le rôle anon) : e-mails, téléphones, jetons push.
    2. Fonctions exécutables par anon alors qu'elles n'ont de sens que connecté ou côté serveur :
       - auto_cancel_pending_bookings_no_response : permettait d'annuler en masse les réservations ;
       - get_matching_transporteurs : renvoyait e-mail, nom et jeton push des transporteurs ;
       - seed_monthly_driver_availabilities, expire_subscriptions, explain_dispatch_wave, etc.
    3. Stockage : listing public du bucket « documents » (permis, pièces des chauffeurs) et de « parcel-photos » ;
       suppression / remplacement de n'importe quel fichier par n'importe quel utilisateur connecté
       (profile-photos, parcel-photos) ; dépôt libre dans « documents ».
    4. bookings : un client / chauffeur pouvait modifier prix, distance, adresses, client, chauffeur…
       (le RLS filtre les lignes, pas les colonnes) ; parcel_quote_requests : statut / offre acceptée.
    5. Vues exposées aux rôles API sans RLS (driver_subscription_details, driver_rating_stats).

  NE CHANGE PAS (à traiter à part, voir le compte rendu)
    - drivers lisible en entier (e-mail, téléphone, jeton push) par tout client connecté
      (politique clients_can_view_active_drivers) : demande une vue ou une RPC dédiée côté app.
    - Bucket « documents » toujours public par URL : l'app et le back-office utilisent getPublicUrl ;
      le passage en privé demande de stocker des chemins et de signer les URL.
*/

-- =============================================================
-- 1. Plus de lecture anonyme des tables clients / drivers
--    (la disponibilité d'un e-mail passe par la fonction is_email_available)
-- =============================================================
DROP POLICY IF EXISTS "anon_can_check_email_exists" ON public.clients;
DROP POLICY IF EXISTS "anon_can_check_driver_email_exists" ON public.drivers;

-- =============================================================
-- 2. Droits d'exécution des fonctions
-- =============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 2a. Réservées au serveur (cron, Edge Functions avec la clé service_role) : ni anon ni connecté
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'auto_cancel_pending_bookings_no_response',
        'seed_monthly_driver_availabilities',
        'expire_subscriptions',
        'reset_monthly_bookings',
        'get_matching_transporteurs'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;

  -- 2b. Réservées aux utilisateurs connectés : plus d'accès anonyme
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'explain_dispatch_wave',
        'get_driver_subscription_status', 'get_driver_subscription_statuses',
        'get_drivers_rating_summaries', 'get_free_rides_used',
        'get_first_paid_subscription_start_date', 'get_last_expired_subscription_end_date',
        'compute_subscription_activation_start',
        'driver_can_accept_new_booking', 'driver_can_view_request', 'driver_covers_date',
        'driver_covers_governorate', 'driver_has_blocking_booking',
        'driver_is_eligible_for_request', 'driver_is_eligible_for_scope',
        'driver_is_eligible_parcel_transporteur', 'driver_is_winning_transporteur',
        'client_owns_request', 'client_may_publish_gps', 'parcel_request_accepts_proposals',
        'accept_booking_offer', 'accept_parcel_proposal', 'cancel_dispatch', 'cancel_immediate_booking',
        'cancel_pending_driver_subscription', 'complete_parcel_delivery', 'decline_booking_offer',
        'extend_driver_subscription', 'validate_driver_subscription_payment',
        'admin_activate_pricing_grid', 'admin_save_pricing_grid', 'get_admin_booking_stats',
        'set_driver_online_status', 'start_dispatch_wave', 'get_driver_accepted_parcel_trips',
        'can_access_parcel_photo', 'is_admin_user', 'is_admin_user_storage'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;
-- Restent publiques volontairement : get_public_platform_stats, get_public_reviews, get_tracking_position,
-- get_nearby_drivers (à réévaluer : positions des chauffeurs en ligne), is_email_available,
-- is_phone_number_available, is_email_confirmed, get_pricing_config.

-- =============================================================
-- 3. Stockage
-- =============================================================
-- 3a. Plus de listing public des pièces des chauffeurs ni des photos de colis.
--     Les URL publiques déjà émises continuent de fonctionner (bucket public) jusqu'au passage en privé.
DROP POLICY IF EXISTS "Documents are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to parcel photos" ON storage.objects;

-- 3b. Photos de colis : seules les politiques « propriétaire de la demande » restent
DROP POLICY IF EXISTS "Clients can delete their parcel photos" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload parcel photos" ON storage.objects;

-- 3c. Dépôt dans « documents » : le nom du fichier doit contenir l'identifiant de l'utilisateur
--     (convention de l'app : driver-documents/<type>_<driverId>_<horodatage>.<ext>)
DROP POLICY IF EXISTS "Drivers can upload documents" ON storage.objects;
CREATE POLICY "Drivers upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND position(auth.uid()::text IN name) > 0);

-- 3d. Photos de profil : chacun ne gère que ses propres fichiers (nom contenant son identifiant :
--     web « <id>-<horodatage>.<ext> », mobile « profile-photos/<type>_<id>_<horodatage>.jpg »)
DROP POLICY IF EXISTS "Allow all authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;

CREATE POLICY "Profile photos insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-photos' AND position(auth.uid()::text IN name) > 0);
CREATE POLICY "Profile photos update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-photos' AND position(auth.uid()::text IN name) > 0)
  WITH CHECK (bucket_id = 'profile-photos' AND position(auth.uid()::text IN name) > 0);
CREATE POLICY "Profile photos delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-photos' AND position(auth.uid()::text IN name) > 0);

-- =============================================================
-- 4. Colonnes protégées sur bookings et parcel_quote_requests
-- =============================================================
CREATE OR REPLACE FUNCTION public.guard_booking_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
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

DROP TRIGGER IF EXISTS trigger_guard_booking_columns ON public.bookings;
CREATE TRIGGER trigger_guard_booking_columns
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_columns();

CREATE OR REPLACE FUNCTION public.guard_parcel_request_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending' OR NEW.accepted_proposal_id IS NOT NULL THEN
      RAISE EXCEPTION 'forbidden_parcel_status: une demande démarre « pending ».' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- L'acceptation et la clôture passent par accept_parcel_proposal / complete_parcel_delivery
  IF NEW.accepted_proposal_id IS DISTINCT FROM OLD.accepted_proposal_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.service_scope IS DISTINCT FROM OLD.service_scope
     OR NEW.direction IS DISTINCT FROM OLD.direction THEN
    RAISE EXCEPTION 'forbidden_parcel_columns: colonne non modifiable.' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'forbidden_parcel_status: seule l''annulation est autorisée directement.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_parcel_request_columns ON public.parcel_quote_requests;
CREATE TRIGGER trigger_guard_parcel_request_columns
  BEFORE INSERT OR UPDATE ON public.parcel_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_parcel_request_columns();

-- =============================================================
-- 5. Vues : appliquer le RLS de l'appelant et fermer l'accès anonyme
-- =============================================================
DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['driver_subscription_details', 'driver_rating_stats']
  LOOP
    IF to_regclass('public.' || v) IS NOT NULL
       AND (SELECT relkind FROM pg_class WHERE oid = to_regclass('public.' || v)) = 'v' THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', v);
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v);
    END IF;
  END LOOP;
END $$;

-- =============================================================
-- 6. Défense en profondeur : anon n'a plus de droits inutiles sur les tables
--    (le RLS reste la protection principale ; ceci limite les dégâts d'une politique trop large)
-- =============================================================
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
