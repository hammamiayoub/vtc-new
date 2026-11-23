/*
  # Bucket « documents » : lecture réservée au propriétaire et à l'administration (préparation du passage en privé)

  La politique « Documents are publicly readable » a déjà été supprimée par 20261124100000 (plus de listing public).
  Les pièces sont encore atteignables par URL publique tant que le bucket est public ; cette migration ajoute
  les droits de lecture AUTHENTIFIÉS dont l'application a besoin pour signer des liens temporaires
  (createSignedUrl) :
    - le chauffeur propriétaire du fichier (son identifiant figure dans le nom : driver-documents/<type>_<id>_<date>.<ext>) ;
    - l'administration.

  Sans danger à appliquer maintenant. Le passage effectif en privé est la migration
  20261125000000_documents_bucket_private.sql, À APPLIQUER SEULEMENT APRÈS la mise en ligne de la version de
  l'application qui signe les liens (lib/documentAccess.ts) : les anciennes versions affichent les pièces par URL publique.

  Retour arrière : supabase/rollbacks/20261124130000_documents_owner_admin_read.down.sql
*/

DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Documents read owner or admin" ON storage.objects;

CREATE POLICY "Documents read owner or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (position(auth.uid()::text IN name) > 0 OR public.is_admin_user_storage())
  );
