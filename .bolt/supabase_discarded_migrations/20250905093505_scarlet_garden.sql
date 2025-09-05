/*
  # Politiques RLS pour le stockage des photos de profil

  1. Sécurité
    - Lecture publique des photos de profil
    - Upload sécurisé pour les utilisateurs authentifiés
    - Gestion des photos par leurs propriétaires uniquement
    - Accès complet pour les administrateurs

  2. Structure
    - `/driver-profiles/{userId}-{timestamp}.{ext}`
    - `/client-profiles/{userId}-{timestamp}.{ext}`
*/

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all profile photos" ON storage.objects;

-- Politique pour la lecture publique des photos de profil
CREATE POLICY "Public can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Politique pour l'upload des photos par les utilisateurs authentifiés
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (
    (name LIKE 'driver-profiles/' || auth.uid()::text || '-%') OR
    (name LIKE 'client-profiles/' || auth.uid()::text || '-%')
  )
);

-- Politique pour la mise à jour des photos par leurs propriétaires
CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (
    (name LIKE 'driver-profiles/' || auth.uid()::text || '-%') OR
    (name LIKE 'client-profiles/' || auth.uid()::text || '-%')
  )
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (
    (name LIKE 'driver-profiles/' || auth.uid()::text || '-%') OR
    (name LIKE 'client-profiles/' || auth.uid()::text || '-%')
  )
);

-- Politique pour la suppression des photos par leurs propriétaires
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (
    (name LIKE 'driver-profiles/' || auth.uid()::text || '-%') OR
    (name LIKE 'client-profiles/' || auth.uid()::text || '-%')
  )
);

-- Politique pour les administrateurs (accès complet)
CREATE POLICY "Admins can manage all profile photos"
ON storage.objects FOR ALL
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