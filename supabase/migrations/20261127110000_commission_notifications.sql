/*
  # Notifications des relevés de commission

  Colonnes de suivi (une notification n'est envoyée qu'une fois) et tâche pg_cron horaire qui appelle la fonction Edge
  `process-commission-statements` (même mécanisme que process-subscription-expirations : secrets Vault
  `project_url` et `subscription_cron_secret`).

    - notified_at          : relevé émis (e-mail + push au chauffeur)
    - reminder_notified_at : rappel la veille de l'échéance
    - overdue_notified_at  : relevé en retard
    - declared_notified_at : alerte à l'administrateur après une déclaration de paiement
*/

ALTER TABLE public.driver_commission_statements
  ADD COLUMN IF NOT EXISTS reminder_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS overdue_notified_at  timestamptz,
  ADD COLUMN IF NOT EXISTS declared_notified_at timestamptz;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-commission-statements';
    PERFORM cron.schedule('process-commission-statements', '20 * * * *', $cron$
      DO $body$
      DECLARE
        v_url text;
        v_secret text;
      BEGIN
        SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
        SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'subscription_cron_secret' LIMIT 1;
        IF v_url IS NULL OR v_secret IS NULL THEN
          RAISE LOG 'process-commission-statements: secrets Vault project_url ou subscription_cron_secret manquants';
          RETURN;
        END IF;
        PERFORM net.http_post(
          url := rtrim(v_url, '/') || '/functions/v1/process-commission-statements',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-subscription-cron-secret', v_secret
          ),
          body := '{}'::jsonb
        );
      END
      $body$;
    $cron$);
  END IF;
END $$;
