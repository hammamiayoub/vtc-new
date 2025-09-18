/*
  # Ajouter le champ ville de résidence

  1. Modifications
    - Ajouter la colonne `city` à la table `drivers`
    - Ajouter la colonne `city` à la table `clients`
    - Ajouter des index pour optimiser les recherches par ville

  2. Sécurité
    - Les politiques RLS existantes couvrent automatiquement le nouveau champ
*/

-- Ajouter la colonne city à la table drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS city text;

-- Ajouter la colonne city à la table clients  
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city text;

-- Ajouter des index pour optimiser les recherches par ville
CREATE INDEX IF NOT EXISTS idx_drivers_city ON drivers(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(city) WHERE city IS NOT NULL;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN drivers.city IS 'Ville de résidence du chauffeur';
COMMENT ON COLUMN clients.city IS 'Ville de résidence du client';