-- Interrupteur de la publication automatique du matin.
-- Une seule ligne : l'administration peut la mettre en pause sans arrêter le job.

CREATE TABLE IF NOT EXISTS public.blog_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  autopublish_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.blog_settings (id, autopublish_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_settings_admin_read" ON public.blog_settings;
CREATE POLICY "blog_settings_admin_read"
  ON public.blog_settings
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "blog_settings_admin_update" ON public.blog_settings;
CREATE POLICY "blog_settings_admin_update"
  ON public.blog_settings
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

GRANT SELECT, UPDATE ON public.blog_settings TO authenticated;
