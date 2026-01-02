# Fix: Field Users Can't See Jobs or Shop Tasks

## Problem
Field users are unable to see jobs or shop tasks because the database migration hasn't been applied yet.

## Solution: Apply the Migration to Supabase

### Step 1: Run the Migration SQL

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `APPLY_THIS_MIGRATION.sql` (in the root of this project)
6. Copy and paste the **entire contents** of that file into the SQL Editor
7. Click **Run** (or press `Cmd+Enter` on Mac / `Ctrl+Enter` on Windows)

### Step 2: Verify Job Stages

After applying the migration, make sure you have at least one job stage marked as field-visible:

1. In Supabase Dashboard, go to **Table Editor**
2. Open the `job_stages` table
3. Find or create a stage (e.g., "Scheduled", "In Progress", "On Route")
4. Set `is_field_visible` to `true` for stages that field workers should see

### Step 3: Verify You Have Data

#### For Jobs:
1. Create a job in the admin panel
2. Assign it a **field-visible stage**
3. Field users should now see it

#### For Shop Tasks:
1. Create a shop task in the admin panel
2. You can leave it unassigned or assign it to a specific field user
3. Field users will see:
   - Tasks assigned to them
   - Tasks with no assignment (marked as "Available")

### Step 4: Test

1. Log in as a field user
2. Check the **Jobs** tab - you should see all jobs with field-visible stages
3. Check the **Tasks** tab - you should see shop tasks

## What Changed

### Before (Current/Broken):
- Field users could only see jobs they were explicitly assigned to in the `job_assignments` table
- This required manual assignment for every job

### After (Fixed):
- Field users can see **all jobs** where the job's stage has `is_field_visible = true`
- Shop tasks show both assigned tasks and unassigned/available tasks
- Much simpler workflow - just set the job stage to control visibility

## Troubleshooting

### Still not seeing jobs?
1. Check browser console (F12) for errors - the debug logging will show what's being fetched
2. Verify the migration was applied successfully (no errors in Supabase SQL Editor)
3. Confirm you have jobs with `is_field_visible = true` stages
4. Make sure you're logged in as a field user (not admin/office)

### Still not seeing shop tasks?
1. Check browser console for errors
2. Verify shop tasks exist in the database
3. Check that the field user is authenticated properly

### Permission denied errors?
- The migration likely didn't apply correctly
- Re-run the SQL from `APPLY_THIS_MIGRATION.sql`
- Check for any error messages in Supabase SQL Editor

## Contact
If issues persist, check the browser console logs (F12 > Console tab) and share any error messages.
