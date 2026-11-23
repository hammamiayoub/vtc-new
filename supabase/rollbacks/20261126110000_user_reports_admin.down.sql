-- Retour arrière de 20261126110000_user_reports_admin.sql
DROP TRIGGER IF EXISTS trg_notify_new_user_report ON public.user_reports;
DROP FUNCTION IF EXISTS public.notify_new_user_report();
ALTER TABLE public.user_reports DROP COLUMN IF EXISTS reported_prev_status;
