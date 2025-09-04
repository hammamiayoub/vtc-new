/*
  # Système de réservation de courses

  1. Nouvelles Tables
    - `bookings` - Réservations de courses
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key vers clients)
      - `driver_id` (uuid, foreign key vers drivers, nullable)
      - `pickup_address` (text) - Adresse de départ
      - `pickup_latitude` (decimal) - Latitude départ
      - `pickup_longitude` (decimal) - Longitude départ
      - `destination_address` (text) - Adresse d'arrivée
      - `destination_latitude` (decimal) - Latitude arrivée
      - `destination_longitude` (decimal) - Longitude arrivée
      - `distance_km` (decimal) - Distance en kilomètres
      - `price_tnd` (decimal) - Prix en dinars tunisiens
      - `status` (text) - Statut de la réservation
      - `scheduled_time` (timestamptz) - Heure prévue
      - `pickup_time` (timestamptz) - Heure de prise en charge
      - `completion_time` (timestamptz) - Heure de fin
      - `notes` (text) - Notes du client
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `bookings`
    - Politiques pour clients (leurs réservations)
    - Politiques pour chauffeurs (réservations assignées)
    - Politiques pour administrateurs (toutes les réservations)

  3. Index
    - Index sur client_id, driver_id, status, scheduled_time
*/

-- Table des réservations
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_address text NOT NULL,
  pickup_latitude decimal(10, 8),
  pickup_longitude decimal(11, 8),
  destination_address text NOT NULL,
  destination_latitude decimal(10, 8),
  destination_longitude decimal(11, 8),
  distance_km decimal(8, 2) NOT NULL,
  price_tnd decimal(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scheduled_time timestamptz NOT NULL,
  pickup_time timestamptz,
  completion_time timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contraintes de statut
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled'));

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_time ON bookings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Trigger pour updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les clients
CREATE POLICY "Clients peuvent voir leurs réservations"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (client_id = uid());

CREATE POLICY "Clients peuvent créer des réservations"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = uid());

CREATE POLICY "Clients peuvent modifier leurs réservations en attente"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (client_id = uid() AND status = 'pending')
  WITH CHECK (client_id = uid());

-- Politiques RLS pour les chauffeurs
CREATE POLICY "Chauffeurs peuvent voir les réservations qui leur sont assignées"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (driver_id = uid());

CREATE POLICY "Chauffeurs peuvent voir les réservations en attente"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    status = 'pending' AND 
    EXISTS (SELECT 1 FROM drivers WHERE drivers.id = uid() AND drivers.status = 'active')
  );

CREATE POLICY "Chauffeurs peuvent accepter des réservations"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending' AND 
    EXISTS (SELECT 1 FROM drivers WHERE drivers.id = uid() AND drivers.status = 'active')
  )
  WITH CHECK (
    driver_id = uid() AND 
    status IN ('accepted', 'in_progress', 'completed')
  );

-- Politiques RLS pour les administrateurs
CREATE POLICY "Administrateurs peuvent voir toutes les réservations"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = uid()));

CREATE POLICY "Administrateurs peuvent modifier toutes les réservations"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = uid()));