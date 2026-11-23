/*
  # Historique des suspensions de comptes

  Mémorise, pour chaque suspension (depuis un signalement ou directement depuis l'administration), le statut du compte
  avant suspension, afin de le rétablir à la levée : un chauffeur validé redevient actif, un chauffeur encore en
  attente de validation ne devient pas actif par erreur.

  Écriture uniquement par la fonction Edge `admin-moderate-user` (service_role). Lecture réservée aux administrateurs.
*/

CREATE TABLE IF NOT EXISTS public.account_suspensions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  role         text NOT NULL CHECK (role IN ('client', 'driver')),
  prev_status  text,
  reason       text,
  report_id    uuid,
  suspended_by uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  lifted_at    timestamptz,
  lifted_by    uuid
);

CREATE INDEX IF NOT EXISTS account_suspensions_user_idx ON public.account_suspensions (user_id, created_at DESC);

ALTER TABLE public.account_suspensions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.account_suspensions FROM anon, authenticated;
GRANT SELECT ON public.account_suspensions TO authenticated;

DROP POLICY IF EXISTS "Admins read account suspensions" ON public.account_suspensions;
CREATE POLICY "Admins read account suspensions" ON public.account_suspensions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));
