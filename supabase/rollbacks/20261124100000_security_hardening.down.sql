-- Retour arrière de 20261124100000_security_hardening.sql
-- ATTENTION : il RÉOUVRE les failles corrigées. À n'utiliser que pour revenir d'un problème de compatibilité,
-- le temps d'adapter l'application.

-- 4. Triggers de protection des colonnes
DROP TRIGGER IF EXISTS trigger_guard_booking_columns ON public.bookings;
DROP FUNCTION IF EXISTS public.guard_booking_columns();
DROP TRIGGER IF EXISTS trigger_guard_parcel_request_columns ON public.parcel_quote_requests;
DROP FUNCTION IF EXISTS public.guard_parcel_request_columns();

-- 3. Stockage : retour aux politiques précédentes
DROP POLICY IF EXISTS "Drivers upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos insert own" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos update own" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos delete own" ON storage.objects;

CREATE POLICY "Drivers can upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Documents are publicly readable" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'documents');
CREATE POLICY "Public read access to parcel photos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'parcel-photos');
CREATE POLICY "Clients can delete their parcel photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'parcel-photos');
CREATE POLICY "Clients can upload parcel photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'parcel-photos');
CREATE POLICY "Allow all authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-photos');
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'profile-photos');
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'profile-photos');
CREATE POLICY "Users can upload profile photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-photos');

-- 2. Fonctions : réouvre l'exécution à anon et PUBLIC pour les fonctions ci-dessous
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'auto_cancel_pending_bookings_no_response', 'seed_monthly_driver_availabilities',
        'expire_subscriptions', 'reset_monthly_bookings', 'get_matching_transporteurs', 'explain_dispatch_wave'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 1. Politiques de lecture anonyme (non recommandé)
CREATE POLICY "anon_can_check_email_exists" ON public.clients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_can_check_driver_email_exists" ON public.drivers FOR SELECT TO anon USING (true);

-- 6. Droits anon
GRANT UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
