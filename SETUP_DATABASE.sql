-- ============================================
-- DATABASE SETUP: Initial Job Stages and Sample Data
-- ============================================
-- Run this in your Supabase SQL Editor to set up the database
-- This creates the necessary job stages and sample data
-- ============================================

-- Step 1: Create Job Stages (if they don't exist)
-- These control the workflow and what field workers can see

INSERT INTO job_stages (name, color, sort_order, is_field_visible, is_active)
VALUES
  ('New', '#64748b', 0, false, true),           -- Admin only - not field visible
  ('Scheduled', '#3b82f6', 1, true, true),      -- Field visible
  ('On Route', '#8b5cf6', 2, true, true),       -- Field visible
  ('In Progress', '#f59e0b', 3, true, true),    -- Field visible
  ('Completed', '#10b981', 4, true, true),      -- Field visible
  ('Cancelled', '#ef4444', 5, false, true)      -- Admin only - not field visible
ON CONFLICT (name) DO NOTHING;

-- Step 2: Get the stage IDs (we'll use them for sample jobs)
DO $$
DECLARE
  scheduled_stage_id UUID;
  in_progress_stage_id UUID;
BEGIN
  -- Get stage IDs
  SELECT id INTO scheduled_stage_id FROM job_stages WHERE name = 'Scheduled' LIMIT 1;
  SELECT id INTO in_progress_stage_id FROM job_stages WHERE name = 'In Progress' LIMIT 1;

  -- Only create sample data if no jobs exist
  IF NOT EXISTS (SELECT 1 FROM jobs LIMIT 1) THEN
    -- Step 3: Create a sample customer (optional - for demo purposes)
    INSERT INTO customers (name, company, email, phone)
    VALUES ('John Smith', 'ABC Company', 'john@abccompany.com', '555-0100')
    ON CONFLICT DO NOTHING;

    -- Step 4: Create sample jobs (optional - for demo purposes)
    INSERT INTO jobs (
      name,
      job_address_street,
      job_address_city,
      job_address_state,
      job_address_zip,
      stage_id,
      scheduled_date,
      scheduled_time_start,
      customer_id
    )
    SELECT
      'Sample Job - Roof Repair',
      '123 Main St',
      'Springfield',
      'IL',
      '62701',
      scheduled_stage_id,
      CURRENT_DATE + INTERVAL '1 day',
      '09:00',
      (SELECT id FROM customers WHERE company = 'ABC Company' LIMIT 1)
    WHERE scheduled_stage_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO jobs (
      name,
      job_address_street,
      job_address_city,
      job_address_state,
      job_address_zip,
      stage_id,
      scheduled_date,
      scheduled_time_start,
      customer_id
    )
    SELECT
      'Sample Job - Gutter Cleaning',
      '456 Oak Ave',
      'Springfield',
      'IL',
      '62702',
      in_progress_stage_id,
      CURRENT_DATE,
      '13:00',
      (SELECT id FROM customers WHERE company = 'ABC Company' LIMIT 1)
    WHERE in_progress_stage_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  -- Step 5: Create sample shop tasks (optional - for demo purposes)
  IF NOT EXISTS (SELECT 1 FROM shop_tasks LIMIT 1) THEN
    INSERT INTO shop_tasks (
      title,
      description,
      task_type,
      status,
      priority,
      due_date,
      assigned_to
    )
    VALUES
      (
        'Oil Change - Truck #1',
        'Regular maintenance oil change for truck',
        'maintenance',
        'pending',
        2,
        CURRENT_DATE + INTERVAL '3 days',
        NULL  -- Unassigned - field workers can pick this up
      ),
      (
        'Brake Inspection - Van #2',
        'Check brake pads and rotors',
        'inspection',
        'pending',
        1,
        CURRENT_DATE + INTERVAL '1 day',
        NULL  -- Unassigned
      ),
      (
        'Engine Repair - Truck #3',
        'Engine making unusual noise - investigate',
        'repair',
        'in_progress',
        3,
        CURRENT_DATE,
        NULL  -- Can assign this to a specific field user later
      )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify everything is set up correctly

-- Check job stages
SELECT
  name,
  color,
  is_field_visible,
  sort_order,
  is_active
FROM job_stages
ORDER BY sort_order;

-- Check jobs
SELECT
  j.name,
  j.scheduled_date,
  s.name as stage,
  s.is_field_visible
FROM jobs j
LEFT JOIN job_stages s ON j.stage_id = s.id
ORDER BY j.scheduled_date;

-- Check shop tasks
SELECT
  title,
  task_type,
  status,
  due_date,
  assigned_to
FROM shop_tasks
ORDER BY due_date;

-- ============================================
-- Summary of what was created:
-- ============================================
-- ✅ 6 Job Stages (4 field-visible, 2 admin-only)
-- ✅ 1 Sample Customer (optional)
-- ✅ 2 Sample Jobs (optional - both field-visible)
-- ✅ 3 Sample Shop Tasks (optional - all unassigned)
--
-- Field workers will now be able to see:
-- - Jobs with stages: Scheduled, On Route, In Progress, Completed
-- - All shop tasks (assigned and unassigned)
-- ============================================
