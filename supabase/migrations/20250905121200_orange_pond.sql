/*
  # Fix users table permission error in RLS policies

  1. Problem
    - RLS policies are trying to access `auth.users` table
    - This causes "permission denied for table users" error
    - Need to remove references to users table in policies

  2. Solution
    - Remove policies that reference `auth.users` table
    - Create simpler policies that only use `auth.uid()`
    - Allow insertion during signup without complex checks

  3. Security
    - Still maintain user isolation with `auth.uid() = id`
    - Allow signup process to work properly
    - Keep admin access intact
*/

-- Drop all existing policies that might reference users table
DROP POLICY IF EXISTS "clients_can_insert_during_signup" ON clients;
DROP POLICY IF EXISTS "drivers_can_insert_during_signup" ON drivers;
DROP POLICY IF EXISTS "clients_can_read_own_data" ON clients;
DROP POLICY IF EXISTS "clients_can_update_own_data" ON clients;
DROP POLICY IF EXISTS "drivers_can_read_own_data" ON drivers;
DROP POLICY IF EXISTS "drivers_can_update_own_data" ON drivers;
DROP POLICY IF EXISTS "admins_full_access_clients" ON clients;
DROP POLICY IF EXISTS "admins_full_access_drivers" ON drivers;

-- Create simple policies for clients table
CREATE POLICY "clients_signup_policy"
  ON clients
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "clients_read_own"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "clients_update_own"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simple policies for drivers table
CREATE POLICY "drivers_signup_policy"
  ON drivers
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "drivers_read_own"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "drivers_update_own"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin policies (check if admin_users table exists first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    -- Admin policies for clients
    EXECUTE 'CREATE POLICY "admin_clients_all" ON clients FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))';
    
    -- Admin policies for drivers
    EXECUTE 'CREATE POLICY "admin_drivers_all" ON drivers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;