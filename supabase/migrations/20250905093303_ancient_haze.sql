/*
  # Politiques RLS pour le stockage des photos de profil

  1. Politiques de stockage
    - Lecture publique des photos de profil
    - Upload pour les utilisateurs authentifiés (leurs propres photos)
    - Mise à jour pour les utilisateurs authentifiés (leurs propres photos)
    - Suppression pour les utilisateurs authentifiés (leurs propres photos)

  2. Sécurité
    - Validation que l'utilisateur ne peut gérer que ses propres photos
    - Accès en lecture pour tous (photos publiques)
    - Structure de dossiers : driver-profiles/ et client-profiles/
*/

-- Politique pour la lecture publique des photos de profil
CREATE POLICY "Public read access for profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Politique pour l'upload de photos par les utilisateurs authentifiés
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] IN ('driver-profiles', 'client-profiles')
  AND (storage.filename(name) LIKE auth.uid()::text || '-%')
);

-- Politique pour la mise à jour de photos par les utilisateurs authentifiés
CREATE POLICY "Users can update their own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] IN ('driver-profiles', 'client-profiles')
  AND (storage.filename(name) LIKE auth.uid()::text || '-%')
)
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] IN ('driver-profiles', 'client-profiles')
  AND (storage.filename(name) LIKE auth.uid()::text || '-%')
);

-- Politique pour la suppression de photos par les utilisateurs authentifiés
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] IN ('driver-profiles', 'client-profiles')
  AND (storage.filename(name) LIKE auth.uid()::text || '-%')
);

-- Politique pour les administrateurs (accès complet)
CREATE POLICY "Admins can manage all profile photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  )
);