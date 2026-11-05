-- RETOUR ARRIÈRE de 20261105130000_subscription_expiration_notifications.sql
--
-- Arrête la planification et supprime les fonctions de notification. Le journal
-- subscription_expiration_notifications est CONSERVÉ (il évite de renvoyer des emails déjà envoyés
-- si on réapplique la migration plus tard).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-subscription-expirations') THEN
    PERFORM cron.unschedule('process-subscription-expirations');
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.get_subscription_notification_candidates();
DROP FUNCTION IF EXISTS public.get_subscription_requests_to_notify();
DROP FUNCTION IF EXISTS public.claim_subscription_notification(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.release_subscription_notification(uuid, text);
