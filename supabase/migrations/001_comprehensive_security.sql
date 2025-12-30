-- =============================================
-- COMPREHENSIVE SECURITY MIGRATION
-- Enables RLS and creates role-based policies
-- =============================================

-- =============================================
-- PART 1: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_flags_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PART 2: DROP ALL INSECURE "Allow all" POLICIES
-- =============================================

DROP POLICY IF EXISTS "Allow all" ON user_profiles;
DROP POLICY IF EXISTS "Allow all" ON app_settings;
DROP POLICY IF EXISTS "Allow all" ON custom_tags;
DROP POLICY IF EXISTS "Allow all" ON customers;
DROP POLICY IF EXISTS "Allow all" ON customer_tags_junction;
DROP POLICY IF EXISTS "Allow all" ON customer_notes;
DROP POLICY IF EXISTS "Allow all" ON customer_history;
DROP POLICY IF EXISTS "Allow all" ON job_stages;
DROP POLICY IF EXISTS "Allow all" ON custom_flags;
DROP POLICY IF EXISTS "Allow all" ON jobs;
DROP POLICY IF EXISTS "Allow all" ON job_flags_junction;
DROP POLICY IF EXISTS "Allow all" ON job_assignments;
DROP POLICY IF EXISTS "Allow all" ON job_history;
DROP POLICY IF EXISTS "Allow all" ON checklist_templates;
DROP POLICY IF EXISTS "Allow all" ON checklist_template_items;
DROP POLICY IF EXISTS "Allow all" ON job_checklists;
DROP POLICY IF EXISTS "Allow all" ON job_checklist_items;
DROP POLICY IF EXISTS "Allow all" ON job_files;
DROP POLICY IF EXISTS "Allow all" ON job_photos;
DROP POLICY IF EXISTS "Allow all" ON invoices;
DROP POLICY IF EXISTS "Allow all" ON invoice_items;
DROP POLICY IF EXISTS "Allow all" ON equipment;
DROP POLICY IF EXISTS "Allow all" ON shop_tasks;
DROP POLICY IF EXISTS "Allow all" ON maintenance_logs;

-- =============================================
-- PART 3: ADD user_role COLUMN TO user_profiles
-- =============================================

-- Add user_role column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'user_role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN user_role TEXT;
  END IF;
END $$;

-- Update existing role column data to user_role
UPDATE user_profiles SET user_role = role WHERE user_role IS NULL;

-- Add constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_role_check
  CHECK (user_role IN ('admin', 'office', 'field'));

-- =============================================
-- PART 4: CREATE HELPER FUNCTIONS
-- =============================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT user_role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is admin or office
CREATE OR REPLACE FUNCTION is_admin_or_office()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND user_role IN ('admin', 'office')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is assigned to a job
CREATE OR REPLACE FUNCTION is_assigned_to_job(job_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM job_assignments
    WHERE job_id = job_uuid
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================
-- PART 5: USER PROFILES POLICIES
-- =============================================

CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (is_admin_or_office());

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON user_profiles FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 6: CUSTOMERS POLICIES
-- =============================================

CREATE POLICY "Authenticated users can view customers"
ON customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin/Office can manage customers"
ON customers FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 7: JOBS POLICIES
-- =============================================

CREATE POLICY "Admin/Office can view all jobs"
ON jobs FOR SELECT
TO authenticated
USING (is_admin_or_office());

CREATE POLICY "Field workers can view assigned jobs"
ON jobs FOR SELECT
TO authenticated
USING (is_assigned_to_job(id));

CREATE POLICY "Admin/Office can manage jobs"
ON jobs FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

CREATE POLICY "Field workers can update assigned jobs"
ON jobs FOR UPDATE
TO authenticated
USING (is_assigned_to_job(id))
WITH CHECK (is_assigned_to_job(id));

-- =============================================
-- PART 8: JOB CHECKLISTS & ITEMS POLICIES
-- =============================================

CREATE POLICY "Users can view checklists for accessible jobs"
ON job_checklists FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

CREATE POLICY "Admin/Office can manage checklists"
ON job_checklists FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

CREATE POLICY "Users can view checklist items for accessible jobs"
ON job_checklist_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_checklists
    WHERE id = checklist_id
    AND (is_admin_or_office() OR is_assigned_to_job(job_id))
  )
);

CREATE POLICY "Users can update checklist items for assigned jobs"
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

CREATE POLICY "Admin/Office can manage checklist items"
ON job_checklist_items FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 9: JOB PHOTOS POLICIES
-- =============================================

CREATE POLICY "Users can view photos for accessible jobs"
ON job_photos FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

CREATE POLICY "Field workers can upload photos to assigned jobs"
ON job_photos FOR INSERT
TO authenticated
WITH CHECK (is_assigned_to_job(job_id));

CREATE POLICY "Users can delete their own photos"
ON job_photos FOR DELETE
TO authenticated
USING (
  is_admin_or_office() OR (
    is_assigned_to_job(job_id) AND uploaded_by = auth.uid()
  )
);

CREATE POLICY "Admin can manage all photos"
ON job_photos FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 10: JOB FILES POLICIES
-- =============================================

CREATE POLICY "Users can view files for accessible jobs"
ON job_files FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

CREATE POLICY "Admin/Office can upload files"
ON job_files FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_office());

CREATE POLICY "Admin can delete files"
ON job_files FOR DELETE
TO authenticated
USING (is_admin_or_office());

CREATE POLICY "Admin can manage all files"
ON job_files FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 11: LOOKUP TABLES (READ-ONLY FOR MOST)
-- =============================================

-- Job Stages
CREATE POLICY "Everyone can view job stages"
ON job_stages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage job stages"
ON job_stages FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- Custom Flags
CREATE POLICY "Everyone can view custom flags"
ON custom_flags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage custom flags"
ON custom_flags FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- Custom Tags
CREATE POLICY "Everyone can view custom tags"
ON custom_tags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage custom tags"
ON custom_tags FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- Checklist Templates
CREATE POLICY "Everyone can view checklist templates"
ON checklist_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage checklist templates"
ON checklist_templates FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- Checklist Template Items
CREATE POLICY "Everyone can view template items"
ON checklist_template_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage template items"
ON checklist_template_items FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 12: JUNCTION TABLES POLICIES
-- =============================================

CREATE POLICY "Users can view job assignments"
ON job_assignments FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR user_id = auth.uid()
);

CREATE POLICY "Admin can manage job assignments"
ON job_assignments FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

CREATE POLICY "Users can view job flags"
ON job_flags_junction FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

CREATE POLICY "Admin can manage job flags"
ON job_flags_junction FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

CREATE POLICY "Users can view customer tags"
ON customer_tags_junction FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage customer tags"
ON customer_tags_junction FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 13: HISTORY TABLES POLICIES
-- =============================================

CREATE POLICY "Users can view job history for accessible jobs"
ON job_history FOR SELECT
TO authenticated
USING (
  is_admin_or_office() OR is_assigned_to_job(job_id)
);

CREATE POLICY "System can create job history"
ON job_history FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view customer history"
ON customer_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage customer history"
ON customer_history FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- Customer Notes
CREATE POLICY "Users can view customer notes"
ON customer_notes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage customer notes"
ON customer_notes FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 14: INVOICES POLICIES
-- =============================================

CREATE POLICY "Admin/Office can view invoices"
ON invoices FOR SELECT
TO authenticated
USING (is_admin_or_office());

CREATE POLICY "Admin/Office can manage invoices"
ON invoices FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

CREATE POLICY "Admin/Office can view invoice items"
ON invoice_items FOR SELECT
TO authenticated
USING (is_admin_or_office());

CREATE POLICY "Admin/Office can manage invoice items"
ON invoice_items FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 15: SHOP/EQUIPMENT POLICIES
-- =============================================

CREATE POLICY "Everyone can view equipment"
ON equipment FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage equipment"
ON equipment FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

CREATE POLICY "Everyone can view shop tasks"
ON shop_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Field workers can update their assigned shop tasks"
ON shop_tasks FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Admin can manage shop tasks"
ON shop_tasks FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

CREATE POLICY "Everyone can view maintenance logs"
ON maintenance_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Field workers can create maintenance logs"
ON maintenance_logs FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());

CREATE POLICY "Admin can manage maintenance logs"
ON maintenance_logs FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());

-- =============================================
-- PART 16: APP SETTINGS POLICIES
-- =============================================

CREATE POLICY "Everyone can view app settings"
ON app_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage app settings"
ON app_settings FOR ALL
TO authenticated
USING (is_admin_or_office())
WITH CHECK (is_admin_or_office());
