-- ============================================
-- Migration: Fix field worker visibility
-- Purpose: Allow field workers to view jobs, shop tasks, job stages, and customers
-- Date: 2026-01-05
-- ============================================

-- Add SELECT policy for field workers on shop_tasks
CREATE POLICY IF NOT EXISTS "Field workers can view shop tasks"
ON shop_tasks
FOR SELECT
TO authenticated
USING (true);

-- Add UPDATE policy for field workers on shop_tasks (to update status)
CREATE POLICY IF NOT EXISTS "Field workers can update shop tasks"
ON shop_tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add SELECT policy for field workers on job_stages (needed for jobs visibility check)
CREATE POLICY IF NOT EXISTS "Field workers can view job stages"
ON job_stages
FOR SELECT
TO authenticated
USING (true);

-- Add SELECT policy for field workers on customers (to view customer info on jobs)
CREATE POLICY IF NOT EXISTS "Field workers can view customers"
ON customers
FOR SELECT
TO authenticated
USING (true);
