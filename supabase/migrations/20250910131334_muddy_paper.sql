/*
  # Création du bucket pour les photos de véhicules

  1. Nouveau bucket
    - `vehicle-photos` pour stocker les photos des véhicules des chauffeurs
  
  2. Sécurité
    - Politique pour permettre aux chauffeurs d'uploader leurs photos de véhicule
    - Politique pour permettre la lecture publique des photos
    - Politique pour permettre aux chauffeurs de supprimer leurs propres photos
*/

-- Créer le bucket pour les photos de véhicules
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux chauffeurs authentifiés d'uploader leurs photos de véhicule
CREATE POLICY "Chauffeurs peuvent uploader leurs photos de véhicule"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos' 
  AND (storage.foldername(name))[1] = 'vehicles'
  AND EXISTS (
    SELECT 1 FROM drivers 
    WHERE drivers.id = auth.uid()
  )
);

-- Politique pour permettre la lecture publique des photos de véhicules
CREATE POLICY "Photos de véhicules publiquement lisibles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-photos');

-- Politique pour permettre aux chauffeurs de supprimer leurs propres photos de véhicule
CREATE POLICY "Chauffeurs peuvent supprimer leurs photos de véhicule"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = 'vehicles'
  AND EXISTS (
    SELECT 1 FROM drivers 
    WHERE drivers.id = auth.uid()
  )
);

-- Politique pour permettre aux chauffeurs de mettre à jour leurs photos de véhicule
CREATE POLICY "Chauffeurs peuvent mettre à jour leurs photos de véhicule"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = 'vehicles'
  AND EXISTS (
    SELECT 1 FROM drivers 
    WHERE drivers.id = auth.uid()
  )
);