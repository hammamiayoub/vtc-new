/*
  # Journal de modération des images (photos de profil et de véhicule)

  La fonction Edge `moderate-image` analyse chaque photo envoyée (API OpenAI Moderation) et consigne ici le verdict :
    - approved : photo acceptée ;
    - rejected : photo refusée et supprimée du stockage ;
    - error    : analyse impossible (service indisponible, clé absente, format non pris en charge). La photo est
                 laissée en place pour ne pas bloquer l'utilisateur ; l'administrateur peut la revoir.

  Lecture réservée aux administrateurs. Les écritures passent uniquement par la fonction Edge (service_role).
*/

CREATE TABLE IF NOT EXISTS public.image_moderation_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  bucket      text NOT NULL,
  path        text NOT NULL,
  public_url  text,
  status      text NOT NULL CHECK (status IN ('approved', 'rejected', 'error')),
  categories  jsonb,
  scores      jsonb,
  detail      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_moderation_log_user_idx ON public.image_moderation_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS image_moderation_log_status_idx ON public.image_moderation_log (status, created_at DESC);

ALTER TABLE public.image_moderation_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.image_moderation_log FROM anon, authenticated;
GRANT SELECT ON public.image_moderation_log TO authenticated;

DROP POLICY IF EXISTS "Admins read image moderation log" ON public.image_moderation_log;
CREATE POLICY "Admins read image moderation log" ON public.image_moderation_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));
