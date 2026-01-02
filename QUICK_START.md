# 🚀 Quick Start: Fix Field User Access

## Problem
Field users can't see jobs or shop tasks because:
1. ❌ No job stages exist in the database
2. ❌ No jobs exist
3. ❌ No shop tasks exist

## Solution (5 minutes)

### Step 1: Set Up the Database

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Open the file **`SETUP_DATABASE.sql`** from your project root
6. **Copy ALL the SQL** and paste into Supabase SQL Editor
7. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)

This will create:
- ✅ 6 job stages (4 field-visible)
- ✅ 2 sample jobs for testing
- ✅ 3 sample shop tasks for testing
- ✅ 1 sample customer

### Step 2: Apply the Migration (IMPORTANT!)

1. Still in **SQL Editor**
2. Click **"New Query"** again
3. Open **`APPLY_THIS_MIGRATION.sql`**
4. Copy and paste into SQL Editor
5. Click **"Run"**

This updates the security policies so field users can see field-visible jobs.

### Step 3: Test

1. **Refresh the diagnostic page** in your app
2. You should now see:
   - ✅ Found 2 jobs
   - ✅ Found 3 shop tasks
   - ✅ Found 6 stages (4 field-visible)

3. Go to **Jobs** tab - you should see the 2 sample jobs
4. Go to **Tasks** tab - you should see the 3 sample tasks

---

## What Each Job Stage Means

| Stage | Field Visible? | Use Case |
|-------|---------------|----------|
| **New** | ❌ No | Admin is reviewing/preparing the job |
| **Scheduled** | ✅ Yes | Job is ready, field workers can see it |
| **On Route** | ✅ Yes | Field worker is traveling to the job |
| **In Progress** | ✅ Yes | Actively working on the job |
| **Completed** | ✅ Yes | Job is done, field worker can view it |
| **Cancelled** | ❌ No | Job cancelled, admin only |

**How it works**: When you create a job in the admin panel, assign it a stage. If the stage is field-visible, field workers will see it!

---

## Creating Real Jobs

After testing with sample data:

1. Go to **Admin Panel** → **Jobs**
2. Click **"Create Job"**
3. Fill in job details
4. **Important**: Set the stage to **"Scheduled"** (or another field-visible stage)
5. Field workers will now see it!

---

## Creating Real Shop Tasks

1. Go to **Admin Panel** → **Shop Tasks**
2. Click **"Create Task"**
3. Fill in task details
4. Leave **"Assigned To"** empty for tasks anyone can pick up
5. Or assign to a specific field user
6. Field workers will see all tasks (assigned + unassigned)

---

## Troubleshooting

### Still seeing "Found 0 jobs"?
- Make sure you ran **both** SQL files (SETUP_DATABASE.sql and APPLY_THIS_MIGRATION.sql)
- Check that jobs have field-visible stages
- Refresh the diagnostic page

### "Permission denied" errors?
- Run the **APPLY_THIS_MIGRATION.sql** script
- This fixes the RLS policies

### Want to delete sample data?
```sql
-- Run this in Supabase SQL Editor to remove sample data
DELETE FROM shop_tasks WHERE title LIKE 'Sample%' OR title LIKE 'Oil Change%' OR title LIKE 'Brake%' OR title LIKE 'Engine%';
DELETE FROM jobs WHERE name LIKE 'Sample%';
DELETE FROM customers WHERE company = 'ABC Company';
```

---

## Next Steps

Once you verify field users can see data:
1. Delete sample data (see above)
2. Create your real jobs and tasks
3. Remove the debug logging from the code (optional)
4. Remove the diagnostic page link from the header (optional)

You're all set! 🎉
