/*
  # Création de la table clients

  1. Nouvelles tables
    - `clients`
      - `id` (uuid, clé primaire, référence vers auth.users)
      - `first_name` (text, prénom du client)
      - `last_name` (text, nom du client)
      - `email` (text, unique, email du client)
      - `phone` (text, numéro de téléphone)
      - `status` (text, statut du compte - active, suspended)
      - `created_at` (timestamp, date de création)
      - `updated_at` (timestamp, dernière mise à jour)

  2. Sécurité
    - Activation de RLS sur la table `clients`
    - Politique permettant aux clients de lire leurs propres données
    - Politique permettant aux clients de mettre à jour leurs propres données
    - Politique permettant l'insertion lors de l'inscription
    - Politique permettant aux administrateurs de lire tous les clients

  3. Index
    - Index sur l'email pour les recherches rapides
    - Index sur le statut pour les filtres
    - Index sur la date de création pour le tri
*/

-- Créer la table clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- Créer les politiques RLS
CREATE POLICY "Clients peuvent lire leurs propres données"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Clients peuvent mettre à jour leurs propres données"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Permettre l'insertion lors de l'inscription client"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Administrateurs peuvent lire tous les clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  ));

CREATE POLICY "Administrateurs peuvent mettre à jour les clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  ));

-- Créer le trigger pour updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();