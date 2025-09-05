/*
  # Configuration du stockage pour les photos de profil

  1. Bucket de stockage
    - Créer le bucket `profile-photos` s'il n'existe pas
    - Configuration publique pour l'accès aux images

  2. Politiques RLS
    - Permettre aux utilisateurs authentifiés d'uploader leurs propres photos
    - Permettre aux utilisateurs authentifiés de mettre à jour leurs propres photos
    - Permettre l'accès public en lecture aux photos
    - Permettre aux utilisateurs de supprimer leurs propres photos

  3. Sécurité
    - Les utilisateurs ne peuvent gérer que leurs propres fichiers
    - Les noms de fichiers doivent commencer par leur user ID
*/

-- Créer le bucket profile-photos s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Politique pour permettre aux utilisateurs authentifiés d'uploader leurs propres photos
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] IN ('driver-profiles', 'client-profiles') AND
  (split_part((storage.filename(name)), '-', 1)) = auth.uid()::text
);

-- Politique pour permettre aux utilisateurs authentifiés de mettre à jour leurs propres photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] IN ('driver-profiles', 'client-profiles') AND
  (split_part((storage.filename(name)), '-', 1)) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] IN ('driver-profiles', 'client-profiles') AND
  (split_part((storage.filename(name)), '-', 1)) = auth.uid()::text
);

-- Politique pour permettre la lecture publique des photos de profil
CREATE POLICY "Public read access to profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Politique pour permettre aux utilisateurs de supprimer leurs propres photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] IN ('driver-profiles', 'client-profiles') AND
  (split_part((storage.filename(name)), '-', 1)) = auth.uid()::text
);

-- Politique pour permettre aux admins de gérer toutes les photos
CREATE POLICY "Admins can manage all profile photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  )
);