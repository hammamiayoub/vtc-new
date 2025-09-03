/*
  # Fix admin_users RLS policies for superadmin creation

  1. Security Changes
    - Drop existing restrictive policies on admin_users table
    - Add new permissive policies that allow authenticated users to insert/update their own admin profile
    - Allow users to insert admin records with their own auth.uid()

  This fixes the RLS violation error when creating the superadmin account.
*/

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Admin users can insert their own profile" ON admin_users;
DROP POLICY IF EXISTS "Admin users can read their own profile" ON admin_users;
DROP POLICY IF EXISTS "Admin users can update their own profile" ON admin_users;

-- Create new permissive policies for admin_users
CREATE POLICY "Allow authenticated users to insert admin profile"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to read own admin profile"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update own admin profile"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);