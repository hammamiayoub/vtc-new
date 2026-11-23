-- Retour arrière de 20261125000000_documents_bucket_private.sql
UPDATE storage.buckets SET public = true WHERE id = 'documents';
