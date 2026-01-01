-- =====================================================
-- CLEANUP: Remove duplicate policies and optimize auth calls
-- Fixes all 89 Supabase warnings
-- =====================================================

-- STEP 1: Drop ALL old "Allow all" policies that are causing conflicts
-- These are creating multiple permissive policies and degrading performance

DROP POLICY IF EXISTS "Allow all" ON app_settings;
DROP POLICY IF EXISTS "Allow all" ON checklist_template_items;
DROP POLICY IF EXISTS "Allow all" ON checklist_templates;
DROP POLICY IF EXISTS "Allow all" ON contacts;
DROP POLICY IF EXISTS "Allow all" ON custom_flags;
DROP POLICY IF EXISTS "Allow all" ON custom_tags;
DROP POLICY IF EXISTS "Allow all" ON customer_history;
DROP POLICY IF EXISTS "Allow all" ON customer_notes;
DROP POLICY IF EXISTS "Allow all" ON customer_tags_junction;
DROP POLICY IF EXISTS "Allow all" ON customers;
DROP POLICY IF EXISTS "Allow all" ON equipment;
DROP POLICY IF EXISTS "Allow all" ON files;
DROP POLICY IF EXISTS "Allow all" ON invoices;
DROP POLICY IF EXISTS "Allow all" ON invoice_items;
DROP POLICY IF EXISTS "Allow all" ON job_assignments;
DROP POLICY IF EXISTS "Allow all" ON job_checklist_items;
DROP POLICY IF EXISTS "Allow all" ON job_checklists;
DROP POLICY IF EXISTS "Allow all" ON job_files;
DROP POLICY IF EXISTS "Allow all" ON job_flags_junction;
DROP POLICY IF EXISTS "Allow all" ON job_history;
DROP POLICY IF EXISTS "Allow all" ON job_photos;
DROP POLICY IF EXISTS "Allow all" ON job_stages;
DROP POLICY IF EXISTS "Allow all" ON jobs;
DROP POLICY IF EXISTS "Allow all" ON maintenance_logs;
DROP POLICY IF EXISTS "Allow all" ON shop_tasks;
DROP POLICY IF EXISTS "Allow all" ON template_items;
DROP POLICY IF EXISTS "Allow all" ON user_profiles;

-- Drop other old policies that might be duplicates
DROP POLICY IF EXISTS "Allow authenticated users to view job files" ON job_files;
DROP POLICY IF EXISTS "Allow authenticated users to insert job files" ON job_files;
DROP POLICY IF EXISTS "Allow authenticated users to update job files" ON job_files;
DROP POLICY IF EXISTS "Allow authenticated users to delete job files" ON job_files;
DROP POLICY IF EXISTS "Allow authenticated users to view job photos" ON job_photos;
DROP POLICY IF EXISTS "Allow authenticated users to insert job photos" ON job_photos;
DROP POLICY IF EXISTS "Allow authenticated users to update job photos" ON job_photos;
DROP POLICY IF EXISTS "Allow authenticated users to delete job photos" ON job_photos;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON job_photos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON job_photos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON job_photos;

-- STEP 2: Optimize auth.uid() calls by wrapping in SELECT
-- This caches the result instead of re-evaluating for each row

-- Fix user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Fix job_assignments policies
DROP POLICY IF EXISTS "Users can view their own assignments" ON job_assignments;
CREATE POLICY "Users can view their own assignments"
  ON job_assignments FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Fix job_photos policies
DROP POLICY IF EXISTS "Field workers can delete their own photos" ON job_photos;
CREATE POLICY "Field workers can delete their own photos"
  ON job_photos FOR DELETE TO authenticated
  USING (uploaded_by = (select auth.uid()) AND is_assigned_to_job(job_id));

-- STEP 3: Verify no orphaned policies remain
-- This query will help you see if there are any other duplicate policies
-- Run this separately to check:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd, policyname;
