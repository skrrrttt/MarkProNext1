-- Fix storage bucket RLS policies for job-photos
-- This fixes the error: "new row violates row-level security policy"

-- ============================================
-- PART 1: Storage Bucket Configuration
-- ============================================

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to job photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their job photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to job-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to job-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to job-photos" ON storage.objects;

-- Storage Policy 1: Allow authenticated users to upload (INSERT) files to job-photos bucket
CREATE POLICY "Allow authenticated uploads to job-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');

-- Storage Policy 2: Allow public read (SELECT) access to job-photos bucket
CREATE POLICY "Allow public read access to job-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'job-photos');

-- Storage Policy 3: Allow authenticated users to delete files from job-photos bucket
CREATE POLICY "Allow authenticated delete from job-photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos');

-- Storage Policy 4: Allow authenticated users to update files in job-photos bucket
CREATE POLICY "Allow authenticated update to job-photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-photos')
WITH CHECK (bucket_id = 'job-photos');

-- ============================================
-- PART 2: job_photos Table RLS Policies
-- ============================================

-- Enable RLS on job_photos table if not already enabled
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing job_photos table policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert job photos" ON job_photos;
DROP POLICY IF EXISTS "Allow public to view job photos" ON job_photos;
DROP POLICY IF EXISTS "Allow authenticated users to delete job photos" ON job_photos;
DROP POLICY IF EXISTS "Allow authenticated users to update job photos" ON job_photos;

-- Table Policy 1: Allow authenticated users to insert photo records
CREATE POLICY "Allow authenticated users to insert job photos"
ON job_photos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Table Policy 2: Allow authenticated users to view photo records
CREATE POLICY "Allow authenticated users to view job photos"
ON job_photos
FOR SELECT
TO authenticated
USING (true);

-- Table Policy 3: Allow authenticated users to delete photo records
CREATE POLICY "Allow authenticated users to delete job photos"
ON job_photos
FOR DELETE
TO authenticated
USING (true);

-- Table Policy 4: Allow authenticated users to update photo records
CREATE POLICY "Allow authenticated users to update job photos"
ON job_photos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
