/*
  # Configuration du stockage pour les photos de profil

  1. Bucket de stockage
    - Créer le bucket `profile-photos` avec accès public
    - Configurer les limites de taille et types de fichiers

  2. Politiques RLS
    - Permettre aux utilisateurs authentifiés d'uploader leurs propres photos
    - Permettre la lecture publique des photos
    - Permettre la mise à jour et suppression de ses propres photos
*/

-- Créer le bucket profile-photos s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow authenticated users to upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view all profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile photos" ON storage.objects;

-- Politique pour permettre l'upload de ses propres photos
CREATE POLICY "Allow authenticated users to upload their own profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.filename(name) ~ ('^' || auth.uid()::text || '-'))
);

-- Politique pour permettre la lecture de toutes les photos de profil
CREATE POLICY "Allow authenticated users to view all profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

-- Politique pour permettre la mise à jour de ses propres photos
CREATE POLICY "Allow authenticated users to update their own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.filename(name) ~ ('^' || auth.uid()::text || '-'))
)
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.filename(name) ~ ('^' || auth.uid()::text || '-'))
);

-- Politique pour permettre la suppression de ses propres photos
CREATE POLICY "Allow authenticated users to delete their own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.filename(name) ~ ('^' || auth.uid()::text || '-'))
);

-- Activer RLS sur storage.objects si ce n'est pas déjà fait
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;