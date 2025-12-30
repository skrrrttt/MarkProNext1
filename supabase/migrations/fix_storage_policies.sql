-- Fix storage bucket RLS policies for job-photos

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to job photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their job photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Policy 1: Allow authenticated users to upload (INSERT) files to job-photos bucket
CREATE POLICY "Allow authenticated uploads to job-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');

-- Policy 2: Allow public read (SELECT) access to job-photos bucket
CREATE POLICY "Allow public read access to job-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'job-photos');

-- Policy 3: Allow authenticated users to delete files from job-photos bucket
CREATE POLICY "Allow authenticated delete from job-photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos');

-- Policy 4: Allow authenticated users to update files in job-photos bucket
CREATE POLICY "Allow authenticated update to job-photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-photos')
WITH CHECK (bucket_id = 'job-photos');
