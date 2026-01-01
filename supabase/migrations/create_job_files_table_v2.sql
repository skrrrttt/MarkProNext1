-- Create job_files table for admin file uploads (PDFs, images, etc.)
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Create the job_files table
-- ============================================

CREATE TABLE IF NOT EXISTS job_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_files_job_id ON job_files(job_id);

-- ============================================
-- PART 2: Table RLS Policies
-- ============================================

ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to insert job files" ON job_files;
DROP POLICY IF EXISTS "Allow authenticated users to view job files" ON job_files;
DROP POLICY IF EXISTS "Allow authenticated users to delete job files" ON job_files;
DROP POLICY IF EXISTS "Allow authenticated users to update job files" ON job_files;

-- Create new policies
CREATE POLICY "Allow authenticated users to insert job files"
ON job_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view job files"
ON job_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete job files"
ON job_files FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update job files"
ON job_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- PART 3: Storage Bucket
-- ============================================

-- Create bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-files',
  'job-files',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- ============================================
-- PART 4: Storage Policies
-- ============================================

-- Drop all existing policies for job-files bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to job-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to job-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to job-files" ON storage.objects;

-- Create storage policies
CREATE POLICY "Allow authenticated uploads to job-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-files');

CREATE POLICY "Allow public read access to job-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'job-files');

CREATE POLICY "Allow authenticated delete from job-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-files');

CREATE POLICY "Allow authenticated update to job-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-files')
WITH CHECK (bucket_id = 'job-files');
