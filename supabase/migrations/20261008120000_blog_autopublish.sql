-- File de sujets et publication automatique : 1 article voyageurs + 1 article chauffeurs par jour.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS keyword text,
  ADD COLUMN IF NOT EXISTS published_day date;

ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_audience_check;
ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_audience_check
  CHECK (audience IS NULL OR audience IN ('client', 'driver'));

ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_source_check;
ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_source_check
  CHECK (source IN ('admin', 'auto'));

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_one_auto_per_audience_per_day
  ON public.blog_posts (audience, published_day)
  WHERE source = 'auto';

CREATE TABLE IF NOT EXISTS public.blog_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL CHECK (audience IN ('client', 'driver')),
  keyword text NOT NULL,
  used_at timestamptz,
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audience, keyword)
);

CREATE INDEX IF NOT EXISTS idx_blog_topics_pending
  ON public.blog_topics (audience, created_at)
  WHERE used_at IS NULL;

ALTER TABLE public.blog_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_topics_admin_all" ON public.blog_topics;
CREATE POLICY "blog_topics_admin_all"
  ON public.blog_topics
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_topics TO authenticated;

INSERT INTO public.blog_topics (audience, keyword)
VALUES
  ('client', 'Transfert touristes visitant la Tunisie'),
  ('client', 'Transport homme d''affaires en Tunisie'),
  ('client', 'famille cherchant un transport collectif en Tunisie'),
  ('client', 'une personne cherchant un chauffeur privé en Tunisie'),
  ('client', 'Quelles sont les meilleures applications de VTC à Tunis ?'),
  ('client', 'Quel chauffeur privé choisir pour un transfert depuis ou vers l''aéroport de Tunis-Carthage ?'),
  ('client', 'Comment trouver un taxi fiable à Carthage pour un déplacement professionnel ?'),
  ('client', 'Quel service de transport collectif utiliser pour des visites touristiques à Monastir ?'),
  ('client', 'Quel est le meilleur chauffeur privé à Tunis pour un rapport qualité-prix intéressant ?'),
  ('client', 'Quelle alternative au taxi traditionnel pour les déplacements à Carthage ?'),
  ('client', 'Où dénicher un service de transfert aéroport de qualité à Monastir ?'),
  ('client', 'Quel service de transport collectif éviter en raison de retards à Enfidha ?'),
  ('client', 'taxi enfidha aéroport'),
  ('client', 'taxi collectif tunis'),
  ('client', 'Pour quelles raisons opter pour un taxi collectif à Tunis ?'),
  ('client', 'réservation taxi en ligne tunisie'),
  ('client', 'Comment réserver un taxi en ligne facilement en Tunisie'),
  ('client', 'Comparer les services VTC disponibles à Tunisie'),
  ('client', 'transfert aéroport carthage'),
  ('client', 'Guide des transferts aéroport à Carthage pour les voyageurs'),
  ('client', 'application vtc tunisie'),
  ('client', 'Les meilleures applications VTC pour se déplacer en Tunisie'),
  ('client', 'vtc tunisie'),
  ('client', 'chauffeur privé tunis'),
  ('client', 'Comment réserver un chauffeur privé à Tunis facilement ?'),
  ('client', 'application taxi tunisie'),
  ('driver', 'Obtenir des courses de transfert pour les touristes en Tunisie'),
  ('driver', 'Réussir une course avec un voyageur d''affaires en Tunisie'),
  ('driver', 'Proposer un van ou un minibus à une famille en Tunisie'),
  ('driver', 'Se faire choisir comme chauffeur privé en Tunisie'),
  ('driver', 'Pourquoi les clients comparent les applications VTC à Tunis'),
  ('driver', 'Préparer un transfert depuis ou vers l''aéroport de Tunis-Carthage'),
  ('driver', 'Assurer un déplacement professionnel fiable à Carthage'),
  ('driver', 'Organiser des visites touristiques en transport collectif à Monastir'),
  ('driver', 'Rester compétitif comme chauffeur privé à Tunis'),
  ('driver', 'Se différencier du taxi traditionnel à Carthage'),
  ('driver', 'Organiser un transfert aéroport de qualité à Monastir'),
  ('driver', 'Éviter les retards sur un transfert à l''aéroport d''Enfidha'),
  ('driver', 'Travailler les prises en charge taxi à l''aéroport d''Enfidha'),
  ('driver', 'Proposer un taxi collectif à Tunis'),
  ('driver', 'Quand accepter une course en taxi collectif à Tunis'),
  ('driver', 'Comprendre une réservation de taxi en ligne en Tunisie'),
  ('driver', 'Répondre à une réservation de taxi en ligne en Tunisie'),
  ('driver', 'Ce que les clients comparent avant de choisir un VTC en Tunisie'),
  ('driver', 'Accueillir un passager pour un transfert aéroport à Carthage'),
  ('driver', 'Guide chauffeur des transferts aéroport à Carthage'),
  ('driver', 'Être visible sur une application VTC en Tunisie'),
  ('driver', 'Ce que les voyageurs attendent d''une application VTC en Tunisie'),
  ('driver', 'Développer son activité de VTC en Tunisie'),
  ('driver', 'Obtenir des courses régulières comme chauffeur privé à Tunis'),
  ('driver', 'Convertir une demande de chauffeur privé à Tunis'),
  ('driver', 'Bonnes pratiques chauffeur sur une application taxi en Tunisie')
ON CONFLICT (audience, keyword) DO NOTHING;

-- Publication quotidienne à 07:00, heure de Tunis (UTC+1).
-- Le job n'appelle la fonction que si les secrets Vault project_url et blog_cron_secret existent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-daily-blog-posts') THEN
      PERFORM cron.unschedule('publish-daily-blog-posts');
    END IF;

    PERFORM cron.schedule(
      'publish-daily-blog-posts',
      '0 6 * * *',
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
        WHERE name = 'blog_cron_secret'
        LIMIT 1;

        IF v_url IS NULL OR v_secret IS NULL THEN
          RAISE LOG 'publish-daily-blog-posts: ajoutez les secrets Vault project_url et blog_cron_secret';
          RETURN;
        END IF;

        PERFORM net.http_post(
          url := rtrim(v_url, '/') || '/functions/v1/publish-daily-blog',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-blog-cron-secret', v_secret
          ),
          body := '{}'::jsonb
        );
      END
      $body$;
      $cron$
    );
  END IF;
END $$;
