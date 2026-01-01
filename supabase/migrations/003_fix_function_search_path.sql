-- =====================================================
-- FIX: Function Search Path Security Warning
-- Sets explicit search_path for all security definer functions
-- =====================================================

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT user_role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix is_admin_or_office function
CREATE OR REPLACE FUNCTION is_admin_or_office()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND user_role IN ('admin', 'office')
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix is_assigned_to_job function
CREATE OR REPLACE FUNCTION is_assigned_to_job(job_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM job_assignments
    WHERE job_id = job_uuid
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public, pg_temp;
