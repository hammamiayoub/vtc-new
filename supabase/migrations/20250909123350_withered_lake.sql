/*
  # Correction des politiques RLS pour le stockage des photos de profil

  1. Suppression des anciennes politiques
  2. Création de nouvelles politiques avec la syntaxe correcte pour Supabase Storage
  3. Permissions pour upload, lecture, mise à jour et suppression des photos de profil
*/

-- Supprimer toutes les politiques existantes pour le bucket profile-photos
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to profile photos" ON storage.objects;

-- S'assurer que le bucket existe et est configuré correctement
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

-- Politique pour permettre aux utilisateurs authentifiés d'uploader leurs propres photos
CREATE POLICY "Authenticated users can upload their profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (
    name LIKE 'driver-profiles/' || auth.uid()::text || '/%' OR
    name LIKE 'client-profiles/' || auth.uid()::text || '/%'
  )
);

-- Politique pour permettre la lecture publique des photos de profil
CREATE POLICY "Public can view all profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (
    name LIKE 'driver-profiles/' || auth.uid()::text || '/%' OR
    name LIKE 'client-profiles/' || auth.uid()::text || '/%'
  )
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (
    name LIKE 'driver-profiles/' || auth.uid()::text || '/%' OR
    name LIKE 'client-profiles/' || auth.uid()::text || '/%'
  )
);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (
    name LIKE 'driver-profiles/' || auth.uid()::text || '/%' OR
    name LIKE 'client-profiles/' || auth.uid()::text || '/%'
  )
);