-- ============================================
-- MANUAL MIGRATION: Fix Field User Access
-- ============================================
-- This migration must be run in your Supabase SQL Editor
--
-- Instructions:
-- 1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your project
-- 3. Go to SQL Editor (left sidebar)
-- 4. Click "New Query"
-- 5. Copy and paste this entire file
-- 6. Click "Run" or press Cmd/Ctrl + Enter
-- ============================================

-- Fix field user access to jobs - allow viewing all field-visible jobs
DROP POLICY IF EXISTS "Field workers can view assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view jobs" ON jobs;
DROP POLICY IF EXISTS "Field workers can view field-visible jobs" ON jobs;

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

-- Fix field user update access
DROP POLICY IF EXISTS "Field workers can update assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update jobs" ON jobs;
DROP POLICY IF EXISTS "Field workers can update field-visible jobs" ON jobs;

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

-- Update job checklists policy
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

-- Update checklist items policies
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
DROP POLICY IF EXISTS "Users can update checklist items for field-visible jobs" ON job_checklist_items;

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

-- Update job photos policies
DROP POLICY IF EXISTS "Users can view photos for accessible jobs" ON job_photos;
DROP POLICY IF EXISTS "Users can view photos for field-visible jobs" ON job_photos;

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
DROP POLICY IF EXISTS "Field workers can upload photos to field-visible jobs" ON job_photos;

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
DROP POLICY IF EXISTS "Users can view files for field-visible jobs" ON job_files;

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
DROP POLICY IF EXISTS "Users can view job flags for field-visible jobs" ON job_flags_junction;

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
DROP POLICY IF EXISTS "Users can view job history for field-visible jobs" ON job_history;

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

-- ============================================
-- Migration complete!
-- ============================================
-- After running this, field users will be able to:
-- 1. See all jobs marked as field-visible (not just assigned jobs)
-- 2. See shop tasks (assigned and unassigned)
-- 3. Update checklists, upload photos for field-visible jobs
-- ============================================
