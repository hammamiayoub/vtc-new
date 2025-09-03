/*
  # Création de la table des chauffeurs

  1. Nouvelles Tables
    - `drivers`
      - `id` (uuid, clé primaire, lié à auth.users)
      - `first_name` (text, prénom du chauffeur)
      - `last_name` (text, nom du chauffeur)  
      - `email` (text, unique, adresse email)
      - `phone` (text, optionnel, numéro de téléphone)
      - `license_number` (text, optionnel, numéro de permis)
      - `vehicle_info` (jsonb, optionnel, informations du véhicule)
      - `status` (text, statut du chauffeur - active, pending, suspended)
      - `created_at` (timestamp, date de création)
      - `updated_at` (timestamp, date de mise à jour)

  2. Sécurité
    - Activation du RLS sur la table `drivers`
    - Politique pour permettre aux chauffeurs de lire leurs propres données
    - Politique pour permettre aux chauffeurs de mettre à jour leurs propres données
    - Politique pour permettre l'insertion lors de l'inscription
*/

-- Créer la table des chauffeurs
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  license_number text,
  vehicle_info jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux chauffeurs de lire leurs propres données
CREATE POLICY "Chauffeurs peuvent lire leurs propres données"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Politique pour permettre aux chauffeurs de mettre à jour leurs propres données
CREATE POLICY "Chauffeurs peuvent mettre à jour leurs propres données"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Politique pour permettre l'insertion lors de l'inscription
CREATE POLICY "Permettre l'insertion lors de l'inscription"
  ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();