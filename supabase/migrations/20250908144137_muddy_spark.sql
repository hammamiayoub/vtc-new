/*
  # Fix driver signup permissions

  1. Security Updates
    - Update RLS policies for drivers table to allow proper signup flow
    - Ensure anonymous users can create driver profiles during signup
    - Maintain security while allowing legitimate signups

  2. Changes
    - Drop existing restrictive signup policy
    - Create new policy that allows both anon and authenticated users to insert
    - Ensure the policy works with the auth flow where user gets created first
*/

-- Drop the existing signup policy that might be too restrictive
DROP POLICY IF EXISTS "drivers_signup_policy" ON drivers;

-- Create a new policy that allows both anonymous and authenticated users to insert
-- This is needed because during signup, the user might be in different auth states
CREATE POLICY "drivers_can_signup"
  ON drivers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also ensure we have a proper policy for drivers to read their own data
DROP POLICY IF EXISTS "drivers_read_own" ON drivers;
CREATE POLICY "drivers_read_own"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- And ensure drivers can update their own profiles
DROP POLICY IF EXISTS "drivers_update_own" ON drivers;
CREATE POLICY "drivers_update_own"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);