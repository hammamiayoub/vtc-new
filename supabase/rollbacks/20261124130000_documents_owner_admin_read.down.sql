-- Retour arrière de 20261124130000_documents_owner_admin_read.sql
DROP POLICY IF EXISTS "Documents read owner or admin" ON storage.objects;
CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (((auth.uid())::text = (storage.foldername(name))[1]) OR public.is_admin_user_storage())
  );
