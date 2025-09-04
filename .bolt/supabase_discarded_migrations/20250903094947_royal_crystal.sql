/*
  # Création de la table clients

  1. Nouvelles tables
    - `clients`
      - `id` (uuid, clé primaire, référence vers users.id)
      - `first_name` (text, requis)
      - `last_name` (text, requis)
      - `email` (text, unique, requis)
      - `phone` (text, requis)
      - `status` (text, défaut 'active')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Activer RLS sur la table `clients`
    - Politique pour que les clients puissent lire/modifier leurs propres données
    - Politique pour que les administrateurs puissent gérer tous les clients

  3. Index
    - Index sur email pour les recherches rapides
    - Index sur status pour filtrer par statut
    - Index sur created_at pour trier par date d'inscription
*/

-- Créer la table clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter la contrainte de clé étrangère vers users
ALTER TABLE clients 
ADD CONSTRAINT clients_id_fkey 
FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;

-- Activer RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politique pour que les clients puissent lire leurs propres données
CREATE POLICY "Clients peuvent lire leurs propres données"
  ON clients
  FOR SELECT
  TO authenticated
  USING (uid() = id);

-- Politique pour que les clients puissent mettre à jour leurs propres données
CREATE POLICY "Clients peuvent mettre à jour leurs propres données"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (uid() = id)
  WITH CHECK (uid() = id);

-- Politique pour permettre l'insertion lors de l'inscription client
CREATE POLICY "Permettre l'insertion lors de l'inscription client"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = id);

-- Politique pour que les administrateurs puissent lire tous les clients
CREATE POLICY "Administrateurs peuvent lire tous les clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = uid()
    )
  );

-- Politique pour que les administrateurs puissent mettre à jour les clients
CREATE POLICY "Administrateurs peuvent mettre à jour les clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = uid()
    )
  );

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();