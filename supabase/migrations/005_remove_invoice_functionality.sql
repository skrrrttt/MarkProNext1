-- =====================================================
-- REMOVE INVOICE FUNCTIONALITY
-- Drops all invoice-related tables, policies, and indexes
-- =====================================================

-- Drop RLS policies for invoice_items
DROP POLICY IF EXISTS "Admin/Office can view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Admin/Office can manage invoice items" ON invoice_items;

-- Drop RLS policies for invoices
DROP POLICY IF EXISTS "Admin/Office can view invoices" ON invoices;
DROP POLICY IF EXISTS "Admin/Office can manage invoices" ON invoices;

-- Drop indexes (if any)
DROP INDEX IF EXISTS idx_invoices_customer;
DROP INDEX IF EXISTS idx_invoices_job;
DROP INDEX IF EXISTS idx_invoice_items_invoice_id;
DROP INDEX IF EXISTS idx_invoices_created_by;

-- Drop tables (invoice_items first due to foreign key)
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Remove invoice-related job stages
DELETE FROM job_stages WHERE name IN ('Invoiced', 'Paid');
