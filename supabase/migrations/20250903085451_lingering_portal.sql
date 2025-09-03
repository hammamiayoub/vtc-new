/*
  # Créer le système de disponibilités des chauffeurs

  1. Nouvelles Tables
    - `driver_availability`
      - `id` (uuid, clé primaire)
      - `driver_id` (uuid, référence vers drivers)
      - `date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `is_available` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Activer RLS sur la table `driver_availability`
    - Politique pour que les chauffeurs puissent gérer leurs propres disponibilités
    - Politique pour que les admins puissent voir toutes les disponibilités

  3. Index
    - Index sur driver_id et date pour optimiser les requêtes
*/

-- Créer la table des disponibilités
CREATE TABLE IF NOT EXISTS driver_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, date, start_time, end_time)
);

-- Activer RLS
ALTER TABLE driver_availability ENABLE ROW LEVEL SECURITY;

-- Politique pour que les chauffeurs puissent gérer leurs propres disponibilités
CREATE POLICY "Chauffeurs peuvent gérer leurs disponibilités"
  ON driver_availability
  FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Politique pour que les admins puissent voir toutes les disponibilités
CREATE POLICY "Admins peuvent voir toutes les disponibilités"
  ON driver_availability
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  ));

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_driver_availability_driver_date 
  ON driver_availability(driver_id, date);

CREATE INDEX IF NOT EXISTS idx_driver_availability_date 
  ON driver_availability(date);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_driver_availability_updated_at
  BEFORE UPDATE ON driver_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();