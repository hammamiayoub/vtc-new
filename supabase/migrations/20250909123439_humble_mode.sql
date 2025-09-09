/*
  # Corriger les politiques RLS de stockage - Supprimer et recréer

  1. Suppression des politiques existantes
     - Supprime toutes les politiques existantes sur storage.objects
  2. Recréation des politiques correctes
     - Politique d'upload pour les utilisateurs authentifiés
     - Politique de lecture publique
     - Politiques de mise à jour et suppression pour les propriétaires
  3. Configuration du bucket
     - Assure que le bucket profile-photos existe et est configuré correctement
*/

-- Supprimer toutes les politiques existantes sur storage.objects
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile photos" ON storage.objects;

-- Assurer que le bucket existe
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

-- Créer les nouvelles politiques avec des noms uniques
CREATE POLICY "profile_photos_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    (
      name LIKE 'driver-profiles/' || auth.uid()::text || '/%' OR
      name LIKE 'client-profiles/' || auth.uid()::text || '/%'
    )
  );

CREATE POLICY "profile_photos_read_policy" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_update_policy" ON storage.objects
  FOR UPDATE TO authenticated
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

CREATE POLICY "profile_photos_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos' AND
    (
      name LIKE 'driver-profiles/' || auth.uid()::text || '/%' OR
      name LIKE 'client-profiles/' || auth.uid()::text || '/%'
    )
  );