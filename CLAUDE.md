# Claude Code Configuration for MarkProNext1

This file contains project-specific instructions and preferences for Claude Code when working with the MarkProNext1 application.

---

## Project Overview

**MarkProNext1** is a job management and field operations platform built with Next.js, Supabase, and TypeScript. It features role-based access control (admin, office, field workers) with real-time data synchronization and offline support.

**Tech Stack:**
- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL with RLS)
- **Auth:** Supabase Authentication
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **State Management:** SWR for data fetching with offline support

---

## Build & Development Commands

### Development
```bash
npm run dev
# Starts development server on http://localhost:3000
```

### Build
```bash
npm run build
# Builds the application for production
# MUST pass TypeScript checks and build successfully before deployment
```

### Lint
```bash
npm run lint
# Runs ESLint to check code quality
```

### Type Check
```bash
npx tsc --noEmit
# Checks TypeScript types without building
```

---

## TypeScript & Build Safety Rules

**CRITICAL:** All code changes MUST follow these rules to prevent Vercel build failures:

1. **No Implicit Any:** Define explicit interfaces for all props and data. Never use `any` type.
2. **Defensive Null Checks:** Never assume Supabase data is present. Always use:
   - Optional chaining: `job?.customer?.name`
   - Guard clauses: `if (!job) return null;`
   - Null coalescing: `user.email || 'unknown'`
3. **Client-Side Safety:** If using `useState`, `useEffect`, or event handlers, MUST add `'use client';` directive at top of file.
4. **Supabase Compatibility:** Ensure queries match the existing table structure in `types/database.ts`.
5. **No Placeholders:** Write full, working code for all requested files.

### Before Every Commit
- ✅ Run `npm run build` to ensure no TypeScript errors
- ✅ Check that all new files have proper type definitions
- ✅ Verify client components have `'use client';` directive

---

## Database Migration Rules (Supabase)

### Migration File Location
```
supabase/migrations/
```

### Migration Naming Convention
```
XXX_descriptive_name.sql
```
Where `XXX` is a sequential number (e.g., `001`, `002`, `003`)

### Current Migrations
1. `001_comprehensive_security.sql` - Initial RLS policies and security
2. `002_cleanup_rls_policies.sql` - RLS policy cleanup
3. `003_fix_function_search_path.sql` - Security function fixes
4. `004_optimize_policies_and_indexes.sql` - Performance optimizations
5. `005_remove_invoice_functionality.sql` - Removed invoice features
6. `006_fix_field_user_access.sql` - Field user visibility policies

### How to Apply Migrations

**Option 1: Manual Application (Current Method)**
1. Go to Supabase Dashboard → SQL Editor
2. Open the migration file from `supabase/migrations/`
3. Copy the SQL and paste into SQL Editor
4. Click "Run" to apply

**Option 2: Using Setup Script**
```bash
node scripts/setup-database.js
```
Requires `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Migration Best Practices

1. **Always use IF EXISTS/IF NOT EXISTS**
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   CREATE POLICY IF NOT EXISTS "policy_name" ON table_name...
   ```

2. **Test migrations on local/staging before production**

3. **Include rollback instructions in comments**

4. **Document what the migration does at the top**
   ```sql
   -- ============================================
   -- Migration: Fix field user access
   -- Purpose: Allow field workers to see field-visible jobs
   -- Date: 2026-01-05
   -- ============================================
   ```

5. **Never modify existing migration files** - Create new ones instead

### Important Database Tables

**Core Tables:**
- `user_profiles` - User data with role-based access
- `customers` - Customer/client information
- `jobs` - Job records with stage tracking
- `job_stages` - Workflow stages (controls field visibility)
- `shop_tasks` - Equipment maintenance tasks
- `equipment` - Fleet/equipment tracking

**Key Columns:**
- `job_stages.is_field_visible` - Controls whether field workers can see jobs in this stage
- `user_profiles.user_role` - Role: 'admin', 'office', or 'field'

---

## GitHub CLI Preferences

### Use GitHub CLI for All GitHub Operations
```bash
gh repo view
gh pr create
gh pr list
gh pr view <number>
gh issue create
gh issue list
```

### Branch Strategy
- **Main branch:** `main` (production)
- **Feature branches:** `claude/feature-name-xxxxx`
- **Always develop on feature branches, never on main**

### Commit Message Format
Use conventional commits with emojis:
```
🎨 feat: Add new feature
🐛 fix: Fix bug description
📚 docs: Update documentation
🔒 security: Security improvements
♻️ refactor: Code refactoring
✅ test: Add tests
🔧 chore: Maintenance tasks
```

### Pull Request Workflow
When creating PRs:
1. Ensure branch is up to date
2. Run `npm run build` to verify no errors
3. Use descriptive PR title and body
4. Include:
   - Summary of changes
   - Testing steps
   - Screenshots (if UI changes)

```bash
gh pr create --title "feat: Add feature name" --body "$(cat <<'EOF'
## Summary
- Change 1
- Change 2

## Testing
- [ ] Tested locally
- [ ] Build passes
- [ ] No TypeScript errors
EOF
)"
```

### Git Operations

**For git push:**
- Always use `git push -u origin <branch-name>`
- Branch names MUST start with `claude/` and end with matching session ID
- On network failures, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

**For git fetch/pull:**
- Prefer fetching specific branches: `git fetch origin <branch-name>`
- If network failures occur, retry up to 4 times with exponential backoff

**Never:**
- ❌ Force push to main/master
- ❌ Skip hooks (--no-verify)
- ❌ Use git commit --amend (unless explicitly requested)
- ❌ Push without running build first

---

## Supabase MCP Configuration

### Current Setup
MCP is configured to connect to Supabase via HTTP:
```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=bqgvlbutnrxovkdnjwna"
```

### Check MCP Connection
```bash
claude mcp list
# Should show: supabase: ✓ Connected
```

---

## File Structure

```
/app
  /admin          # Admin/office user pages
  /field          # Field worker pages
  /api            # API routes
/lib
  /auth           # Authentication logic
  /supabase       # Supabase client setup
  /offline        # Offline/SWR data fetching
/supabase
  /migrations     # Database migrations
/types
  database.ts     # TypeScript types for Supabase tables
/scripts
  setup-database.js  # Automated database setup
```

---

## Common Tasks

### Creating a New Migration
1. Create file: `supabase/migrations/00X_description.sql`
2. Write SQL with proper DROP IF EXISTS clauses
3. Test in Supabase SQL Editor
4. Document in git commit
5. Apply to production via Supabase Dashboard

### Adding a New Page
1. Create in appropriate directory (`/app/admin`, `/app/field`)
2. Add `'use client';` if using React hooks
3. Define proper TypeScript interfaces
4. Use `useSupabaseQuery` for data fetching
5. Add to navigation if needed

### Debugging Data Issues
1. Use `/field/diagnostic` page to check database state
2. Check browser console for query errors
3. Verify RLS policies in Supabase Dashboard
4. Check `is_field_visible` on job stages

---

## Environment Variables

### Required for Development
```bash
NEXT_PUBLIC_SUPABASE_URL=https://bqgvlbutnrxovkdnjwna.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Required for Database Scripts
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Vercel Deployment
Set these in Vercel Dashboard → Project Settings → Environment Variables

---

## Debugging Commands

### Check Supabase Connection
```bash
node -e "const { createClient } = require('@supabase/supabase-js'); const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); s.from('jobs').select('count').then(console.log)"
```

### Verify TypeScript
```bash
npx tsc --noEmit
```

### Check Build
```bash
npm run build 2>&1 | grep -i error
```

---

## Important Notes

1. **Field User Visibility:**
   - Field users can ONLY see jobs with `job_stages.is_field_visible = true`
   - Field users can see ALL shop tasks (assigned and unassigned)
   - This is controlled by RLS policies in migration `006_fix_field_user_access.sql`

2. **Authentication:**
   - Supabase Auth handles all authentication
   - User roles stored in `user_profiles.user_role`
   - Auth context provided via `@/lib/auth/AuthProvider`

3. **Offline Support:**
   - Uses SWR with custom `useSupabaseQuery` hook
   - Data cached in browser for offline access
   - Automatic revalidation on reconnection

4. **Type Safety:**
   - All database types in `types/database.ts`
   - Must match actual Supabase schema
   - Update when schema changes

---

## Contact & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com
- **GitHub Repository:** Check with `gh repo view`
- **Project Documentation:** See `QUICK_START.md` and `FIELD_USER_FIX_INSTRUCTIONS.md`

---

**Last Updated:** 2026-01-05
