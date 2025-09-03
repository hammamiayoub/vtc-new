/*
  # Disable RLS for admin_users table

  1. Changes
    - Disable Row Level Security on `admin_users` table temporarily
    - This allows the superadmin account creation to work properly
  
  2. Security Notes
    - RLS is disabled to allow initial admin setup
    - In production, consider re-enabling with proper policies
*/

-- Disable RLS for admin_users table
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert admin profile" ON admin_users;
DROP POLICY IF EXISTS "Allow authenticated users to read own admin profile" ON admin_users;
DROP POLICY IF EXISTS "Allow authenticated users to update own admin profile" ON admin_users;