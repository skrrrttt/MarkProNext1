-- Create job_files table for admin file uploads (PDFs, images, etc.)

CREATE TABLE IF NOT EXISTS job_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type (application/pdf, image/jpeg, etc.)
  file_size INTEGER NOT NULL, -- in bytes
  storage_path TEXT NOT NULL, -- path in Supabase storage
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster job lookups
CREATE INDEX IF NOT EXISTS idx_job_files_job_id ON job_files(job_id);

-- Enable RLS
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;

-- Policies for job_files table
CREATE POLICY "Allow authenticated users to insert job files"
ON job_files
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view job files"
ON job_files
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete job files"
ON job_files
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to update job files"
ON job_files
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Storage bucket for job files
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-files', 'job-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to job-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to job-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to job-files" ON storage.objects;

-- Storage policies for job-files bucket
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
