/*
  # Fix RLS policy for drivers table

  1. Security Changes
    - Drop existing RLS policies for drivers table
    - Create new policy to allow authenticated users to insert their own profile
    - Create policy to allow users to read their own data
    - Create policy to allow users to update their own data
    - Create policy to allow admins full access
    - Create policy to allow clients to view active drivers

  This fixes the "new row violates row-level security policy" error during driver signup.
*/

-- Drop existing policies for drivers table
DROP POLICY IF EXISTS "drivers_insert_own_profile" ON drivers;
DROP POLICY IF EXISTS "drivers_select_own_data" ON drivers;
DROP POLICY IF EXISTS "drivers_update_own_data" ON drivers;
DROP POLICY IF EXISTS "admin_full_access_drivers" ON drivers;
DROP POLICY IF EXISTS "clients_view_active_drivers" ON drivers;

-- Create policy to allow authenticated users to insert their own profile
CREATE POLICY "drivers_insert_own_profile"
  ON drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policy to allow users to read their own data
CREATE POLICY "drivers_select_own_data"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy to allow users to update their own data
CREATE POLICY "drivers_update_own_data"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policy to allow admins full access
CREATE POLICY "admin_full_access_drivers"
  ON drivers
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

-- Create policy to allow clients to view active drivers
CREATE POLICY "clients_view_active_drivers"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (status = 'active');