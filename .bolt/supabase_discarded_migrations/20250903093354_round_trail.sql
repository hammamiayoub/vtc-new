/*
  # Create clients table

  1. New Tables
    - `clients`
      - `id` (uuid, primary key, references users.id)
      - `first_name` (text, required)
      - `last_name` (text, required)
      - `email` (text, unique, required)
      - `phone` (text, required)
      - `status` (text, default 'active')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `clients` table
    - Add policies for clients to read/update their own data
    - Add policies for admins to read/update all client data

  3. Indexes
    - Index on email for fast lookups
    - Index on status for filtering
    - Index on created_at for sorting
*/

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

-- Add foreign key constraint to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_id_fkey'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_id_fkey 
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- RLS Policies for clients
CREATE POLICY "Clients peuvent lire leurs propres données"
  ON clients
  FOR SELECT
  TO authenticated
  USING (uid() = id);

CREATE POLICY "Clients peuvent mettre à jour leurs propres données"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (uid() = id)
  WITH CHECK (uid() = id);

CREATE POLICY "Permettre l'insertion lors de l'inscription client"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = id);

-- RLS Policies for admins
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

-- Add trigger for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();