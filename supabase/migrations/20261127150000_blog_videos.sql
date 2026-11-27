-- Vidéos dans les articles de blog (envoi depuis l'administration).

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-videos',
  'blog-videos',
  true,
  52428800,
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "blog_videos_public_read" ON storage.objects;
CREATE POLICY "blog_videos_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'blog-videos');

DROP POLICY IF EXISTS "blog_videos_admin_insert" ON storage.objects;
CREATE POLICY "blog_videos_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'blog-videos'
    AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "blog_videos_admin_update" ON storage.objects;
CREATE POLICY "blog_videos_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'blog-videos'
    AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'blog-videos'
    AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "blog_videos_admin_delete" ON storage.objects;
CREATE POLICY "blog_videos_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'blog-videos'
    AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );
