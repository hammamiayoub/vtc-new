/*
  # Fix admin_users RLS policies

  1. Security Updates
    - Drop existing restrictive policies on admin_users table
    - Add new policies that allow authenticated users to manage their own admin profile
    - Allow INSERT operations where auth.uid() matches the id being inserted
    - Allow UPDATE operations where auth.uid() matches the existing id
    - Allow SELECT operations where auth.uid() matches the id

  2. Changes
    - Remove old policies that were preventing upsert operations
    - Add proper policies for INSERT, UPDATE, and SELECT operations
    - Ensure superadmin account creation works correctly
*/

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert their own admin profile" ON admin_users;
DROP POLICY IF EXISTS "Allow authenticated users to read their own admin profile" ON admin_users;
DROP POLICY IF EXISTS "Allow authenticated users to update their own admin profile" ON admin_users;

-- Create new policies that allow proper upsert operations
CREATE POLICY "Admin users can insert their own profile"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin users can read their own profile"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin users can update their own profile"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);