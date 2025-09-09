/*
  # Fix storage RLS policies for profile photos with user-specific folders

  1. Storage Configuration
    - Ensure profile-photos bucket exists and is properly configured
    - Enable RLS on the bucket
    
  2. Security Policies
    - Allow authenticated users to upload photos to their own user folder
    - Allow authenticated users to update their own photos
    - Allow authenticated users to delete their own photos
    - Allow public read access to all profile photos
    
  3. Path Structure
    - Files are stored in: {userType}-profiles/{userId}/{filename}
    - This allows granular access control based on user ID
*/

-- Create the profile-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on the bucket
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-photos';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload their profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to profile photos" ON storage.objects;

-- Policy for INSERT (Upload) - users can only upload to their own folder
CREATE POLICY "Allow authenticated users to upload their profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy for UPDATE (Replace existing photo) - users can only update their own photos
CREATE POLICY "Allow authenticated users to update their profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy for DELETE - users can only delete their own photos
CREATE POLICY "Allow authenticated users to delete their profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy for SELECT (Read) - allow public read access to all profile photos
CREATE POLICY "Allow public read access to profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');