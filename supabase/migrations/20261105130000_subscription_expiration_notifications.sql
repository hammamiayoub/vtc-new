-- Notifications d'abonnement chauffeur : expiration (J-7, J-1, expiré) et demandes de souscription.
--
-- CONTEXTE
--   mark_expired_subscriptions / process_subscription_expirations existaient mais rien ne les
--   planifiait ni ne notifiait : le chauffeur découvrait l'expiration quand ses courses étaient
--   bloquées, et l'admin n'était pas prévenu des nouvelles demandes.
--
-- CE QUE FAIT CETTE MIGRATION
--   1. get_subscription_notification_candidates()  : rappels à envoyer aujourd'hui
--        - expiring_soon_7d : fin dans 2 à 7 jours
--        - expiring_soon_1d : fin aujourd'hui ou demain
--        - expired          : expiré depuis 7 jours au plus
--      Un abonnement déjà renouvelé ou prolongé (autre abonnement payé qui finit plus tard) est exclu.
--   2. get_subscription_requests_to_notify()       : demandes en attente créées depuis moins de 3 jours
--      (accusé de réception au chauffeur + alerte à l'admin ; la limite de 3 jours évite d'envoyer des
--      mails pour d'anciennes demandes à la mise en route).
--   3. claim_subscription_notification / release_subscription_notification : anti-doublon.
--      L'Edge Function « réserve » la notification AVANT d'envoyer l'email et la libère si l'envoi
--      échoue, donc : jamais deux emails pour la même échéance, et nouvel essai au passage suivant.
--      La clé contient la date de fin (ex. expiring_soon_7d:2026-11-12) : une prolongation par l'admin
--      déclenche de nouveaux rappels pour la nouvelle échéance.
--   4. Un job pg_cron horaire qui appelle l'Edge Function process-subscription-expirations.
--
-- DROITS
--   Toutes ces fonctions sont réservées à service_role (elles renvoient emails et téléphones).
--
-- MISE EN SERVICE (une seule fois)
--   - Vault : créer le secret `subscription_cron_secret` (le secret `project_url` existe déjà pour le blog).
--   - Edge Function : supabase functions deploy process-subscription-expirations --no-verify-jwt
--     avec les secrets SUBSCRIPTION_CRON_SECRET (même valeur que dans Vault), RESEND_API_KEY, et
--     optionnellement SITE_URL et ADMIN_NOTIFICATION_EMAILS. Voir
--     supabase/functions/process-subscription-expirations/README.md.
--   - Premier essai : appeler la fonction avec {"dry_run": true} pour voir ce qui serait envoyé.
--
-- RETOUR ARRIÈRE : supabase/rollbacks/20261105130000_subscription_expiration_notifications.down.sql

CREATE OR REPLACE FUNCTION public.get_subscription_notification_candidates()
RETURNS TABLE (
  subscription_id uuid,
  driver_id uuid,
  driver_email text,
  first_name text,
  last_name text,
  push_token text,
  lifetime_accepted_bookings integer,
  notification_type text,
  notification_key text,
  end_date date,
  billing_period text,
  days_remaining integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH paid AS (
    SELECT
      ds.id,
      ds.driver_id,
      ds.end_date,
      ds.billing_period::text AS billing_period,
      (ds.end_date - CURRENT_DATE) AS days_left
    FROM public.driver_subscriptions ds
    WHERE ds.payment_status = 'paid'
      AND ds.status <> 'cancelled'
      AND ds.end_date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE + 7
  ),
  typed AS (
    SELECT
      p.*,
      CASE
        WHEN p.days_left >= 2 THEN 'expiring_soon_7d'
        WHEN p.days_left >= 0 THEN 'expiring_soon_1d'
        ELSE 'expired'
      END AS ntype
    FROM paid p
    WHERE NOT EXISTS (
      -- déjà renouvelé ou prolongé : un autre abonnement payé couvre une période plus tardive
      SELECT 1
      FROM public.driver_subscriptions nx
      WHERE nx.driver_id = p.driver_id
        AND nx.id <> p.id
        AND nx.payment_status = 'paid'
        AND nx.status <> 'cancelled'
        AND nx.end_date > p.end_date
        AND nx.end_date >= CURRENT_DATE
    )
  )
  SELECT
    t.id,
    t.driver_id,
    d.email::text,
    d.first_name::text,
    d.last_name::text,
    d.push_token::text,
    COALESCE(d.lifetime_accepted_bookings, 0),
    t.ntype,
    t.ntype || ':' || t.end_date::text,
    t.end_date,
    t.billing_period,
    t.days_left::integer
  FROM typed t
  JOIN public.drivers d ON d.id = t.driver_id
  WHERE d.email IS NOT NULL
    AND btrim(d.email) <> ''
  ORDER BY t.end_date, t.id
$$;

CREATE OR REPLACE FUNCTION public.get_subscription_requests_to_notify()
RETURNS TABLE (
  subscription_id uuid,
  driver_id uuid,
  driver_email text,
  first_name text,
  last_name text,
  phone text,
  billing_period text,
  total_price_tnd numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ds.id,
    ds.driver_id,
    d.email::text,
    d.first_name::text,
    d.last_name::text,
    d.phone::text,
    ds.billing_period::text,
    ds.total_price_tnd::numeric,
    ds.created_at
  FROM public.driver_subscriptions ds
  JOIN public.drivers d ON d.id = ds.driver_id
  WHERE ds.payment_status = 'pending'
    AND ds.status = 'active'
    AND ds.created_at > now() - interval '3 days'
  ORDER BY ds.created_at
$$;

CREATE OR REPLACE FUNCTION public.claim_subscription_notification(
  p_subscription_id uuid,
  p_driver_id uuid,
  p_key text,
  p_channel text DEFAULT 'email'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO public.subscription_expiration_notifications (
    subscription_id, driver_id, notification_type, sent_via
  )
  VALUES (p_subscription_id, p_driver_id, p_key, p_channel)
  ON CONFLICT (subscription_id, notification_type) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_subscription_notification(
  p_subscription_id uuid,
  p_key text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.subscription_expiration_notifications
  WHERE subscription_id = p_subscription_id
    AND notification_type = p_key
$$;

REVOKE ALL ON FUNCTION public.get_subscription_notification_candidates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_subscription_requests_to_notify() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_subscription_notification(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_subscription_notification(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_subscription_notification_candidates() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_subscription_requests_to_notify() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_subscription_notification(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_subscription_notification(uuid, text) TO service_role;

-- ─── Planification horaire (même mécanisme que la publication du blog) ──────────
-- Toutes les heures à la minute 5. L'Edge Function n'envoie les rappels aux chauffeurs qu'entre 8 h et
-- 20 h (heure de Tunis) ; les alertes admin et accusés de réception partent à toute heure.
-- Le job n'appelle la fonction que si les secrets Vault project_url et subscription_cron_secret existent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-subscription-expirations') THEN
      PERFORM cron.unschedule('process-subscription-expirations');
    END IF;

    PERFORM cron.schedule(
      'process-subscription-expirations',
      '5 * * * *',
      $cron$
      DO $body$
      DECLARE
        v_url text;
        v_secret text;
      BEGIN
        SELECT decrypted_secret INTO v_url
        FROM vault.decrypted_secrets
        WHERE name = 'project_url'
        LIMIT 1;

        SELECT decrypted_secret INTO v_secret
        FROM vault.decrypted_secrets
        WHERE name = 'subscription_cron_secret'
        LIMIT 1;

        IF v_url IS NULL OR v_secret IS NULL THEN
          RAISE LOG 'process-subscription-expirations: ajoutez les secrets Vault project_url et subscription_cron_secret';
          RETURN;
        END IF;

        PERFORM net.http_post(
          url := rtrim(v_url, '/') || '/functions/v1/process-subscription-expirations',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-subscription-cron-secret', v_secret
          ),
          body := '{}'::jsonb
        );
      END
      $body$;
      $cron$
    );
  END IF;
END
$$;
