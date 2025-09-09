/*
  # Simplifier les politiques de stockage pour les photos de profil

  1. Suppression de toutes les politiques existantes
  2. Création de politiques simples pour permettre l'upload
  3. Configuration basique du bucket
*/

-- Supprimer toutes les politiques existantes sur storage.objects
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads on profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own profile-photos" ON storage.objects;

-- Supprimer les politiques sur storage.buckets si elles existent
DROP POLICY IF EXISTS "Public bucket access" ON storage.buckets;

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

-- Politique très permissive pour les uploads (temporaire pour debug)
CREATE POLICY "Allow all authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

-- Politique pour la lecture publique
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Politique pour les mises à jour
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos');

-- Politique pour les suppressions
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos');