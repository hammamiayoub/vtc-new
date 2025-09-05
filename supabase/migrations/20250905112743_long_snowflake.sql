/*
  # Fix RLS policies for clients table

  1. Security Changes
    - Drop existing conflicting policies
    - Create proper INSERT policy for authenticated users
    - Ensure users can only insert their own profile data
    - Maintain existing SELECT and UPDATE policies
    - Preserve admin access policies

  2. Policy Details
    - `clients_can_insert_own_profile`: Allows authenticated users to insert their own client profile
    - Uses `auth.uid() = id` to ensure users can only create profiles for themselves
    - Maintains security isolation between users
*/

-- Disable RLS temporarily to clean up policies
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "admin_full_access_clients" ON clients;
DROP POLICY IF EXISTS "clients_insert_own_profile" ON clients;
DROP POLICY IF EXISTS "clients_select_own_data" ON clients;
DROP POLICY IF EXISTS "clients_update_own_data" ON clients;

-- Re-enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for clients table
CREATE POLICY "clients_can_insert_own_profile"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "clients_can_read_own_data"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "clients_can_update_own_data"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admins_full_access_clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );