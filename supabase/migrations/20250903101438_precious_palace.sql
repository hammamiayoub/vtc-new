/*
  # Créer la table des réservations

  1. Nouvelles Tables
    - `bookings`
      - `id` (uuid, clé primaire)
      - `client_id` (uuid, référence vers clients)
      - `driver_id` (uuid, référence vers drivers, optionnel)
      - `pickup_address` (text, adresse de départ)
      - `pickup_latitude` (double precision, optionnel)
      - `pickup_longitude` (double precision, optionnel)
      - `destination_address` (text, adresse d'arrivée)
      - `destination_latitude` (double precision, optionnel)
      - `destination_longitude` (double precision, optionnel)
      - `distance_km` (double precision, distance en kilomètres)
      - `price_tnd` (double precision, prix en dinars tunisiens)
      - `status` (text, statut de la réservation)
      - `scheduled_time` (timestamp, heure programmée)
      - `pickup_time` (timestamp, heure de prise en charge, optionnel)
      - `completion_time` (timestamp, heure de fin, optionnel)
      - `notes` (text, notes du client, optionnel)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Activer RLS sur la table `bookings`
    - Politique pour que les clients voient leurs propres réservations
    - Politique pour que les clients créent leurs propres réservations
    - Politique pour que les chauffeurs voient les réservations qui leur sont assignées
    - Politique pour que les chauffeurs mettent à jour le statut de leurs réservations
    - Politique pour que les admins voient toutes les réservations

  3. Index
    - Index sur client_id pour les requêtes par client
    - Index sur driver_id pour les requêtes par chauffeur
    - Index sur status pour filtrer par statut
    - Index sur scheduled_time pour les requêtes temporelles
*/

-- Créer la table des réservations
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_address text NOT NULL,
  pickup_latitude double precision,
  pickup_longitude double precision,
  destination_address text NOT NULL,
  destination_latitude double precision,
  destination_longitude double precision,
  distance_km double precision NOT NULL,
  price_tnd double precision NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  scheduled_time timestamptz NOT NULL,
  pickup_time timestamptz,
  completion_time timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Activer RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les clients
CREATE POLICY "Clients peuvent voir leurs propres réservations"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients peuvent créer leurs propres réservations"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients peuvent mettre à jour leurs propres réservations"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Politiques RLS pour les chauffeurs
CREATE POLICY "Chauffeurs peuvent voir les réservations qui leur sont assignées"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Chauffeurs peuvent accepter des réservations"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (driver_id IS NULL OR driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Politiques RLS pour les administrateurs
CREATE POLICY "Administrateurs peuvent voir toutes les réservations"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()
  ));

CREATE POLICY "Administrateurs peuvent mettre à jour toutes les réservations"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()
  ));

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_time ON bookings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_bookings_updated_at'
  ) THEN
    CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;