/*
  # Bucket « documents » privé

  ⚠ NE PAS APPLIQUER AVANT que la version de l'application mobile signant les liens (lib/documentAccess.ts,
  écran d'administration des documents) soit en ligne et adoptée. Une fois le bucket privé, les URL publiques
  enregistrées dans driver_documents.file_url cessent de fonctionner : seuls les liens signés (créés par un
  utilisateur autorisé par la politique « Documents read owner or admin ») donnent accès aux fichiers.

  Les liens envoyés par e-mail à l'administration sont générés signés (fonction notify-document-upload).
  Retour arrière : supabase/rollbacks/20261125000000_documents_bucket_private.down.sql
*/
UPDATE storage.buckets SET public = false WHERE id = 'documents';
