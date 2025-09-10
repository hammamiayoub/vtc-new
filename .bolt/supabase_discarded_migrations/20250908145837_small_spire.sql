/*
  # Fix RLS policies for driver signup

  1. Policy Updates
    - Update drivers signup policy to properly allow anonymous users
    - Ensure anon role can insert into drivers table during signup
    - Fix any restrictive policies preventing signup flow

  2. Security
    - Maintain proper RLS while allowing signup
    - Ensure users can only manage their own data after authentication
*/

-- Drop existing restrictive policies that might be blocking signup
DROP POLICY IF EXISTS "drivers_can_signup" ON drivers;

-- Create a proper signup policy for drivers that allows anonymous users
CREATE POLICY "drivers_signup_policy"
  ON drivers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure drivers can read their own profile after signup
DROP POLICY IF EXISTS "drivers_read_own" ON drivers;
CREATE POLICY "drivers_read_own"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (uid() = id);

-- Ensure drivers can update their own profile
DROP POLICY IF EXISTS "drivers_update_own" ON drivers;
CREATE POLICY "drivers_update_own"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (uid() = id)
  WITH CHECK (uid() = id);

-- Ensure the existing admin and client view policies remain intact
-- (keeping existing admin_drivers_all and clients_can_view_active_drivers policies)