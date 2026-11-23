/*
  # Signalements : traitement par l'administrateur et e-mail de notification

  - Colonne reported_prev_status : statut du compte signalé avant une suspension, pour le rétablir ensuite.
  - Trigger : à chaque nouveau signalement, appelle la fonction Edge `notify-new-report` (e-mail à l'administrateur).
    L'appel utilise la clé service_role lue dans le Vault (secrets `project_url` et `service_role_key`, les mêmes que
    pour les tâches planifiées). Si le Vault n'est pas configuré ou si l'appel échoue, le signalement est quand même
    enregistré : seul l'e-mail est perdu (un avertissement est écrit dans les journaux Postgres).
*/

ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS reported_prev_status text;

CREATE OR REPLACE FUNCTION public.notify_new_user_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
    IF v_url IS NULL OR v_key IS NULL THEN
      RAISE WARNING 'notify_new_user_report : secrets Vault project_url ou service_role_key manquants';
      RETURN NEW;
    END IF;
    PERFORM net.http_post(
      url := rtrim(v_url, '/') || '/functions/v1/notify-new-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object('reportId', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_user_report : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_new_user_report() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_new_user_report ON public.user_reports;
CREATE TRIGGER trg_notify_new_user_report
  AFTER INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_user_report();
