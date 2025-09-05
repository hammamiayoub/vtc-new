/*
  # Ajouter les colonnes profile_photo_url

  1. Modifications des tables
    - Ajouter `profile_photo_url` à la table `drivers`
    - Ajouter `profile_photo_url` à la table `clients`
  
  2. Colonnes ajoutées
    - `profile_photo_url` (text, nullable) - URL de la photo de profil stockée dans Supabase Storage
*/

-- Ajouter la colonne profile_photo_url à la table drivers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN profile_photo_url text;
  END IF;
END $$;

-- Ajouter la colonne profile_photo_url à la table clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN profile_photo_url text;
  END IF;
END $$;