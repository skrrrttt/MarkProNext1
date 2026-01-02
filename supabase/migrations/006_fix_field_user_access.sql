-- Fix field user access to jobs and shop tasks
-- This migration allows field users to view all field-visible jobs, not just assigned ones

-- Drop existing restrictive policies for field workers
DROP POLICY IF EXISTS "Field workers can view assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Field workers can update assigned jobs" ON jobs;

-- Create new policy allowing field users to view all field-visible jobs
CREATE POLICY "Field workers can view field-visible jobs"
ON jobs FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM job_stages
    WHERE job_stages.id = jobs.stage_id
    AND job_stages.is_field_visible = true
  )
);

-- Allow field workers to update jobs they're assigned to OR any field-visible job
CREATE POLICY "Field workers can update field-visible jobs"
ON jobs FOR UPDATE
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM job_stages
    WHERE job_stages.id = jobs.stage_id
    AND job_stages.is_field_visible = true
  )
)
WITH CHECK (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM job_stages
    WHERE job_stages.id = jobs.stage_id
    AND job_stages.is_field_visible = true
  )
);

-- Update job checklists policy to allow field users to view checklists for field-visible jobs
DROP POLICY IF EXISTS "Users can view checklists for accessible jobs" ON job_checklists;
CREATE POLICY "Users can view checklists for accessible jobs"
ON job_checklists FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM jobs
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE jobs.id = job_checklists.job_id
    AND job_stages.is_field_visible = true
  )
);

-- Update checklist items policy
DROP POLICY IF EXISTS "Users can view checklist items for accessible jobs" ON job_checklist_items;
CREATE POLICY "Users can view checklist items for accessible jobs"
ON job_checklist_items FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM job_checklists
    JOIN jobs ON job_checklists.job_id = jobs.id
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE job_checklists.id = job_checklist_items.checklist_id
    AND job_stages.is_field_visible = true
  )
);

DROP POLICY IF EXISTS "Users can update checklist items for assigned jobs" ON job_checklist_items;
CREATE POLICY "Users can update checklist items for field-visible jobs"
ON job_checklist_items FOR UPDATE
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM job_checklists
    JOIN jobs ON job_checklists.job_id = jobs.id
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE job_checklists.id = job_checklist_items.checklist_id
    AND job_stages.is_field_visible = true
  )
)
WITH CHECK (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM job_checklists
    JOIN jobs ON job_checklists.job_id = jobs.id
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE job_checklists.id = job_checklist_items.checklist_id
    AND job_stages.is_field_visible = true
  )
);

-- Update job photos policy
DROP POLICY IF EXISTS "Users can view photos for accessible jobs" ON job_photos;
CREATE POLICY "Users can view photos for field-visible jobs"
ON job_photos FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM jobs
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE jobs.id = job_photos.job_id
    AND job_stages.is_field_visible = true
  )
);

DROP POLICY IF EXISTS "Field workers can upload photos to assigned jobs" ON job_photos;
CREATE POLICY "Field workers can upload photos to field-visible jobs"
ON job_photos FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM jobs
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE jobs.id = job_photos.job_id
    AND job_stages.is_field_visible = true
  )
);

-- Update job files policy
DROP POLICY IF EXISTS "Users can view files for accessible jobs" ON job_files;
CREATE POLICY "Users can view files for field-visible jobs"
ON job_files FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM jobs
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE jobs.id = job_files.job_id
    AND job_stages.is_field_visible = true
  )
);

-- Update job flags policy
DROP POLICY IF EXISTS "Users can view job flags" ON job_flags_junction;
CREATE POLICY "Users can view job flags for field-visible jobs"
ON job_flags_junction FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM jobs
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE jobs.id = job_flags_junction.job_id
    AND job_stages.is_field_visible = true
  )
);

-- Update job history policy
DROP POLICY IF EXISTS "Users can view job history for accessible jobs" ON job_history;
CREATE POLICY "Users can view job history for field-visible jobs"
ON job_history FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR
  EXISTS (
    SELECT 1 FROM jobs
    JOIN job_stages ON jobs.stage_id = job_stages.id
    WHERE jobs.id = job_history.job_id
    AND job_stages.is_field_visible = true
  )
);
