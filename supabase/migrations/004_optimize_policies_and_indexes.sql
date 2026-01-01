-- =====================================================
-- PERFORMANCE OPTIMIZATION MIGRATION
-- Fixes multiple permissive policies and adds missing indexes
-- =====================================================

-- =====================================================
-- PART 1: FIX MULTIPLE PERMISSIVE POLICIES
-- Combine duplicate policies into single optimized policies
-- =====================================================

-- ============ USER_PROFILES ============
-- Fix SELECT policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin/Office can view all profiles" ON user_profiles;

CREATE POLICY "Users can view profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (
  id = (select auth.uid()) OR is_admin_or_office()
);

-- Fix UPDATE policies
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON user_profiles;

CREATE POLICY "Users can update profiles"
ON user_profiles FOR UPDATE
TO authenticated
USING (
  id = (select auth.uid()) OR is_admin_or_office()
)
WITH CHECK (
  id = (select auth.uid()) OR is_admin_or_office()
);

-- Keep the admin ALL policy for INSERT/DELETE
DROP POLICY IF EXISTS "Admin/Office can manage all profiles" ON user_profiles;
CREATE POLICY "Admin can manage all profiles"
ON user_profiles FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- ============ JOBS ============
-- Fix SELECT policies
DROP POLICY IF EXISTS "Admin/Office can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Field workers can view assigned jobs" ON jobs;

CREATE POLICY "Users can view jobs"
ON jobs FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(id)
);

-- Fix UPDATE policies
DROP POLICY IF EXISTS "Admin/Office can manage jobs" ON jobs;
DROP POLICY IF EXISTS "Field workers can update assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Admin/Office can update jobs" ON jobs;

CREATE POLICY "Users can update jobs"
ON jobs FOR UPDATE
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(id)
)
WITH CHECK (
  is_admin_or_office() OR is_assigned_to_job(id)
);

-- Keep admin policy for INSERT/DELETE
CREATE POLICY "Admin can manage jobs"
ON jobs FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- ============ JOB_PHOTOS ============
-- Fix SELECT policies
DROP POLICY IF EXISTS "Users can view photos for accessible jobs" ON job_photos;
DROP POLICY IF EXISTS "Admin can manage all photos" ON job_photos;
DROP POLICY IF EXISTS "Admin/Office can manage all photos" ON job_photos;
DROP POLICY IF EXISTS "Field workers can view photos for assigned jobs" ON job_photos;

CREATE POLICY "Users can view photos"
ON job_photos FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

-- Fix INSERT policies
DROP POLICY IF EXISTS "Field workers can upload photos to assigned jobs" ON job_photos;
DROP POLICY IF EXISTS "Field workers can upload photos for assigned jobs" ON job_photos;

CREATE POLICY "Users can upload photos"
ON job_photos FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

-- Fix DELETE policies
DROP POLICY IF EXISTS "Users can delete their own photos" ON job_photos;
DROP POLICY IF EXISTS "Field workers can delete their own photos" ON job_photos;

CREATE POLICY "Users can delete photos"
ON job_photos FOR DELETE
TO authenticated
USING (
  is_admin_or_office() OR
  (is_assigned_to_job(job_id) AND uploaded_by = (select auth.uid()))
);

-- ============ JOB_FILES ============
-- Fix SELECT policies
DROP POLICY IF EXISTS "Users can view files for accessible jobs" ON job_files;
DROP POLICY IF EXISTS "Admin can manage all files" ON job_files;
DROP POLICY IF EXISTS "Admin/Office can manage all files" ON job_files;
DROP POLICY IF EXISTS "Field workers can view files for assigned jobs" ON job_files;

CREATE POLICY "Users can view files"
ON job_files FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

-- Keep admin-only policies for INSERT/DELETE
DROP POLICY IF EXISTS "Admin/Office can upload files" ON job_files;
CREATE POLICY "Admin can upload files"
ON job_files FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_office());

DROP POLICY IF EXISTS "Admin can delete files" ON job_files;
CREATE POLICY "Admin can delete files"
ON job_files FOR DELETE
TO authenticated
USING (is_admin_or_office());

-- ============ JOB_CHECKLISTS ============
-- Fix SELECT policies
DROP POLICY IF EXISTS "Users can view checklists for accessible jobs" ON job_checklists;
DROP POLICY IF EXISTS "Admin/Office can manage checklists" ON job_checklists;
DROP POLICY IF EXISTS "Admin/Office can manage all job checklists" ON job_checklists;
DROP POLICY IF EXISTS "Field workers can view checklists for assigned jobs" ON job_checklists;

CREATE POLICY "Users can view checklists"
ON job_checklists FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

-- Fix UPDATE policies
DROP POLICY IF EXISTS "Field workers can update checklist items for assigned jobs" ON job_checklists;

CREATE POLICY "Users can update checklists"
ON job_checklists FOR UPDATE
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
)
WITH CHECK (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

-- Keep admin policy for INSERT/DELETE
CREATE POLICY "Admin can manage checklists"
ON job_checklists FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- ============ JOB_CHECKLIST_ITEMS ============
-- Fix SELECT policies
DROP POLICY IF EXISTS "Users can view checklist items for accessible jobs" ON job_checklist_items;
DROP POLICY IF EXISTS "Admin/Office can manage checklist items" ON job_checklist_items;
DROP POLICY IF EXISTS "Field workers can view checklist items" ON job_checklist_items;

CREATE POLICY "Users can view checklist items"
ON job_checklist_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_checklists
    WHERE id = checklist_id
    AND (is_admin_or_office() OR is_assigned_to_job(job_id))
  )
);

-- Fix UPDATE policies
DROP POLICY IF EXISTS "Users can update checklist items for assigned jobs" ON job_checklist_items;
DROP POLICY IF EXISTS "Field workers can update checklist items" ON job_checklist_items;

CREATE POLICY "Users can update checklist items"
ON job_checklist_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_checklists
    WHERE id = checklist_id
    AND (is_admin_or_office() OR is_assigned_to_job(job_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM job_checklists
    WHERE id = checklist_id
    AND (is_admin_or_office() OR is_assigned_to_job(job_id))
  )
);

-- Keep admin policy for INSERT/DELETE
CREATE POLICY "Admin can manage checklist items"
ON job_checklist_items FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- ============ JOB_HISTORY ============
-- Fix SELECT policies
DROP POLICY IF EXISTS "Users can view job history for accessible jobs" ON job_history;
DROP POLICY IF EXISTS "Admin/Office can manage job history" ON job_history;
DROP POLICY IF EXISTS "Field workers can view job history" ON job_history;

CREATE POLICY "Users can view job history"
ON job_history FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

-- Keep other policies
CREATE POLICY "System can create job history"
ON job_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============ JOB_ASSIGNMENTS ============
-- Fix SELECT policies
DROP POLICY IF EXISTS "Users can view job assignments" ON job_assignments;
DROP POLICY IF EXISTS "Admin can manage job assignments" ON job_assignments;
DROP POLICY IF EXISTS "Admin/Office can manage all assignments" ON job_assignments;
DROP POLICY IF EXISTS "Users can view their own assignments" ON job_assignments;

CREATE POLICY "Users can view assignments"
ON job_assignments FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR user_id = (select auth.uid())
);

-- Keep admin policy for other operations
CREATE POLICY "Admin can manage assignments"
ON job_assignments FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- ============ EQUIPMENT ============
-- Fix SELECT policies - remove the duplicate from "FOR ALL"
DROP POLICY IF EXISTS "Everyone can view equipment" ON equipment;
DROP POLICY IF EXISTS "Admin can manage equipment" ON equipment;
DROP POLICY IF EXISTS "Admin/Office can manage equipment" ON equipment;
DROP POLICY IF EXISTS "Field workers can view equipment" ON equipment;

CREATE POLICY "Everyone can view equipment"
ON equipment FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage equipment"
ON equipment FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_office());

CREATE POLICY "Admin can update equipment"
ON equipment FOR UPDATE
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

CREATE POLICY "Admin can delete equipment"
ON equipment FOR DELETE
TO authenticated
USING (is_admin_or_office());

-- =====================================================
-- PART 2: ADD MISSING INDEXES ON FOREIGN KEYS
-- These improve JOIN and foreign key lookup performance
-- =====================================================

-- Checklist template items
CREATE INDEX IF NOT EXISTS idx_checklist_template_items_template_id
ON checklist_template_items(template_id);

-- Customer history
CREATE INDEX IF NOT EXISTS idx_customer_history_user_id
ON customer_history(user_id);

-- Customer notes
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id
ON customer_notes(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_notes_user_id
ON customer_notes(user_id);

-- Customer tags junction
CREATE INDEX IF NOT EXISTS idx_customer_tags_junction_tag_id
ON customer_tags_junction(tag_id);

-- Invoice items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
ON invoice_items(invoice_id);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_created_by
ON invoices(created_by);

-- Job assignments
CREATE INDEX IF NOT EXISTS idx_job_assignments_assigned_by
ON job_assignments(assigned_by);

-- Job checklist items
CREATE INDEX IF NOT EXISTS idx_job_checklist_items_checked_by
ON job_checklist_items(checked_by);

CREATE INDEX IF NOT EXISTS idx_job_checklist_items_checklist_id
ON job_checklist_items(checklist_id);

-- Job checklists
CREATE INDEX IF NOT EXISTS idx_job_checklists_job_id
ON job_checklists(job_id);

CREATE INDEX IF NOT EXISTS idx_job_checklists_template_id
ON job_checklists(template_id);

-- Job files
CREATE INDEX IF NOT EXISTS idx_job_files_uploaded_by
ON job_files(uploaded_by);

-- Job flags junction
CREATE INDEX IF NOT EXISTS idx_job_flags_junction_flag_id
ON job_flags_junction(flag_id);

-- Job history
CREATE INDEX IF NOT EXISTS idx_job_history_user_id
ON job_history(user_id);

-- Job photos
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id
ON job_photos(job_id);

CREATE INDEX IF NOT EXISTS idx_job_photos_uploaded_by
ON job_photos(uploaded_by);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_created_by
ON jobs(created_by);

-- Maintenance logs
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_equipment_id
ON maintenance_logs(equipment_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_performed_by
ON maintenance_logs(performed_by);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_shop_task_id
ON maintenance_logs(shop_task_id);

-- Shop tasks
CREATE INDEX IF NOT EXISTS idx_shop_tasks_completed_by
ON shop_tasks(completed_by);

CREATE INDEX IF NOT EXISTS idx_shop_tasks_created_by
ON shop_tasks(created_by);

-- Template items
CREATE INDEX IF NOT EXISTS idx_template_items_template_id
ON template_items(template_id);

-- =====================================================
-- PART 3: REMOVE UNUSED INDEXES
-- These indexes have never been used and waste space
-- =====================================================

DROP INDEX IF EXISTS idx_jobs_stage;
DROP INDEX IF EXISTS idx_job_assignments_user;
DROP INDEX IF EXISTS idx_shop_tasks_equipment;
DROP INDEX IF EXISTS idx_shop_tasks_assigned;
