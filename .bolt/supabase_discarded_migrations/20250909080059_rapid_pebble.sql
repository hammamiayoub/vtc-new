/*
  # Fix storage RLS policies for profile photos

  1. Storage Policies
    - Enable RLS on profile-photos bucket
    - Allow authenticated users to upload their own profile photos
    - Allow authenticated users to update their own profile photos
    - Allow public read access to profile photos
    - Allow users to delete their own profile photos

  2. Security
    - Users can only upload/update files in their designated folders
    - File names must include their user ID for security
    - Separate folders for drivers and clients
*/

-- Enable RLS on the storage.objects table for profile-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy to allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND (
    (
      (storage.foldername(name))[1] = 'driver-profiles' AND 
      name LIKE 'driver-profiles/' || auth.uid()::text || '%'
    ) OR (
      (storage.foldername(name))[1] = 'client-profiles' AND 
      name LIKE 'client-profiles/' || auth.uid()::text || '%'
    )
  )
);

-- Policy to allow authenticated users to update their own profile photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND (
    (
      (storage.foldername(name))[1] = 'driver-profiles' AND 
      name LIKE 'driver-profiles/' || auth.uid()::text || '%'
    ) OR (
      (storage.foldername(name))[1] = 'client-profiles' AND 
      name LIKE 'client-profiles/' || auth.uid()::text || '%'
    )
  )
)
WITH CHECK (
  bucket_id = 'profile-photos' AND (
    (
      (storage.foldername(name))[1] = 'driver-profiles' AND 
      name LIKE 'driver-profiles/' || auth.uid()::text || '%'
    ) OR (
      (storage.foldername(name))[1] = 'client-profiles' AND 
      name LIKE 'client-profiles/' || auth.uid()::text || '%'
    )
  )
);

-- Policy to allow authenticated users to delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND (
    (
      (storage.foldername(name))[1] = 'driver-profiles' AND 
      name LIKE 'driver-profiles/' || auth.uid()::text || '%'
    ) OR (
      (storage.foldername(name))[1] = 'client-profiles' AND 
      name LIKE 'client-profiles/' || auth.uid()::text || '%'
    )
  )
);

-- Policy to allow public read access to profile photos
CREATE POLICY "Public can view profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');