-- =============================================
-- MARKPRO DATABASE SCHEMA v2.0
-- Field Service Management Platform
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CLEANUP (Drop existing tables if migrating)
-- =============================================
DROP TABLE IF EXISTS job_checklist_items CASCADE;
DROP TABLE IF EXISTS job_checklists CASCADE;
DROP TABLE IF EXISTS checklist_templates CASCADE;
DROP TABLE IF EXISTS template_items CASCADE;
DROP TABLE IF EXISTS job_photos CASCADE;
DROP TABLE IF EXISTS job_files CASCADE;
DROP TABLE IF EXISTS job_assignments CASCADE;
DROP TABLE IF EXISTS job_history CASCADE;
DROP TABLE IF EXISTS job_flags_junction CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS job_stages CASCADE;
DROP TABLE IF EXISTS custom_flags CASCADE;
DROP TABLE IF EXISTS customer_history CASCADE;
DROP TABLE IF EXISTS customer_notes CASCADE;
DROP TABLE IF EXISTS customer_tags_junction CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS custom_tags CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS shop_tasks CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- Keep old tables for reference during migration
-- DROP TABLE IF EXISTS contacts CASCADE;
-- DROP TABLE IF EXISTS files CASCADE;

-- =============================================
-- USER PROFILES & SETTINGS
-- =============================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'office', 'field')),
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CUSTOMERS (CRM)
-- =============================================

CREATE TABLE custom_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1', -- Tailwind indigo
    category TEXT DEFAULT 'customer' CHECK (category IN ('customer', 'job')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Basic Info
    name TEXT NOT NULL,
    company TEXT,
    -- Contact
    email TEXT,
    phone TEXT,
    phone_secondary TEXT,
    -- Address
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    -- Billing (can differ from service address)
    billing_same_as_service BOOLEAN DEFAULT true,
    billing_street TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_zip TEXT,
    -- Metadata
    notes TEXT,
    source TEXT, -- How they found us: referral, google, repeat, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_tags_junction (
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES custom_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (customer_id, tag_id)
);

CREATE TABLE customer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),
    action TEXT NOT NULL, -- 'created', 'updated', 'note_added', 'job_created', etc.
    changes JSONB, -- What changed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- JOB PIPELINE
-- =============================================

CREATE TABLE job_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    sort_order INTEGER NOT NULL,
    is_field_visible BOOLEAN DEFAULT false, -- Show to field workers?
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default stages
INSERT INTO job_stages (name, color, sort_order, is_field_visible) VALUES
    ('Lead', '#94a3b8', 1, false),           -- Gray - new inquiry
    ('Quote Sent', '#f59e0b', 2, false),     -- Amber - awaiting response
    ('Approved', '#10b981', 3, false),       -- Green - customer approved
    ('Scheduled', '#3b82f6', 4, true),       -- Blue - on calendar, visible to field
    ('In Progress', '#8b5cf6', 5, true),     -- Purple - actively working
    ('Completed', '#22c55e', 6, true),       -- Green - work done
    ('Invoiced', '#06b6d4', 7, false),       -- Cyan - invoice sent
    ('Paid', '#10b981', 8, false),           -- Green - payment received
    ('Closed', '#64748b', 9, false);         -- Slate - archived

CREATE TABLE custom_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#ef4444',
    icon TEXT DEFAULT 'flag', -- lucide icon name
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default flags
INSERT INTO custom_flags (name, color, icon) VALUES
    ('Urgent', '#ef4444', 'alert-circle'),
    ('Need to Contact', '#f59e0b', 'phone'),
    ('Waiting on Customer', '#6366f1', 'clock'),
    ('Needs Site Visit', '#8b5cf6', 'map-pin'),
    ('VIP Customer', '#eab308', 'star');

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Relationships
    customer_id UUID REFERENCES customers(id),
    stage_id UUID REFERENCES job_stages(id),
    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    -- Location (can differ from customer address)
    job_address_street TEXT,
    job_address_city TEXT,
    job_address_state TEXT,
    job_address_zip TEXT,
    use_customer_address BOOLEAN DEFAULT true,
    -- Scheduling
    scheduled_date DATE,
    scheduled_time_start TIME,
    scheduled_time_end TIME,
    estimated_hours DECIMAL(5,2),
    -- Pricing
    quote_amount DECIMAL(10,2),
    final_amount DECIMAL(10,2),
    -- Photo requirements
    photos_required_before BOOLEAN DEFAULT false,
    photos_required_after BOOLEAN DEFAULT false,
    -- Metadata
    priority INTEGER DEFAULT 0, -- Higher = more urgent
    internal_notes TEXT, -- Office only
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_flags_junction (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    flag_id UUID REFERENCES custom_flags(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, flag_id)
);

CREATE TABLE job_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES user_profiles(id),
    UNIQUE(job_id, user_id)
);

CREATE TABLE job_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),
    action TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHECKLISTS
-- =============================================

CREATE TABLE checklist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false, -- Auto-add to new jobs
    category TEXT DEFAULT 'job' CHECK (category IN ('job', 'equipment', 'safety')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES checklist_templates(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false
);

CREATE TABLE job_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    template_id UUID REFERENCES checklist_templates(id),
    name TEXT NOT NULL,
    is_master BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID REFERENCES job_checklists(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    checked_by UUID REFERENCES user_profiles(id),
    checked_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false
);

-- =============================================
-- FILES & PHOTOS
-- =============================================

-- Files are stored in Supabase Storage, this tracks metadata
CREATE TABLE job_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    uploaded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after', 'progress', 'other')),
    caption TEXT,
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES user_profiles(id),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVOICING (Framework)
-- =============================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Relationships
    job_id UUID REFERENCES jobs(id),
    customer_id UUID REFERENCES customers(id),
    -- Invoice Details
    invoice_number TEXT UNIQUE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
    -- Amounts
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    -- Dates
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,
    -- External IDs
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- =============================================
-- SHOP TASKS & EQUIPMENT
-- =============================================

CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT, -- 'vehicle', 'striper', 'trailer', 'tool', etc.
    make TEXT,
    model TEXT,
    year INTEGER,
    serial_number TEXT,
    vin TEXT,
    license_plate TEXT,
    -- Maintenance tracking
    last_service_date DATE,
    next_service_date DATE,
    service_interval_miles INTEGER,
    service_interval_hours INTEGER,
    current_miles INTEGER,
    current_hours INTEGER,
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_shop', 'retired')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shop_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- What
    title TEXT NOT NULL,
    description TEXT,
    equipment_id UUID REFERENCES equipment(id),
    task_type TEXT DEFAULT 'maintenance' CHECK (task_type IN ('maintenance', 'repair', 'inspection', 'other')),
    -- Who & When
    assigned_to UUID REFERENCES user_profiles(id),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 0,
    -- Costs
    parts_cost DECIMAL(10,2),
    labor_hours DECIMAL(5,2),
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    shop_task_id UUID REFERENCES shop_tasks(id),
    -- What was done
    service_type TEXT NOT NULL,
    description TEXT,
    -- Readings at service
    miles_at_service INTEGER,
    hours_at_service INTEGER,
    -- Costs
    parts_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    vendor TEXT,
    -- Metadata
    service_date DATE DEFAULT CURRENT_DATE,
    performed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_tags ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Permissive policies (single team - adjust for multi-tenant later)
CREATE POLICY "Allow all" ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON custom_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON customer_tags_junction FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON customer_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON customer_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON job_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON custom_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON job_flags_junction FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON job_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON job_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON checklist_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON template_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON job_checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON job_checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON job_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON job_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON equipment FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shop_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON maintenance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE job_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE job_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE job_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE shop_tasks;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_stage ON jobs(stage_id);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_date);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX idx_job_assignments_user ON job_assignments(user_id);
CREATE INDEX idx_job_history_job ON job_history(job_id);
CREATE INDEX idx_customer_history_customer ON customer_history(customer_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_job ON invoices(job_id);
CREATE INDEX idx_shop_tasks_equipment ON shop_tasks(equipment_id);
CREATE INDEX idx_shop_tasks_assigned ON shop_tasks(assigned_to);

-- =============================================
-- DEFAULT DATA
-- =============================================

-- Default checklist templates
INSERT INTO checklist_templates (name, description, is_default, category) VALUES
    ('Standard Job Checklist', 'Default checklist for all jobs', true, 'job'),
    ('Striper Truck Pre-Trip', 'Daily inspection before use', false, 'equipment'),
    ('Safety Checklist', 'Job site safety verification', false, 'safety');

INSERT INTO template_items (template_id, text, sort_order, is_required) 
SELECT id, 'Contact customer to confirm', 1, false FROM checklist_templates WHERE name = 'Standard Job Checklist'
UNION ALL
SELECT id, 'Review job scope and specs', 2, false FROM checklist_templates WHERE name = 'Standard Job Checklist'
UNION ALL
SELECT id, 'Load required materials', 3, false FROM checklist_templates WHERE name = 'Standard Job Checklist'
UNION ALL
SELECT id, 'Complete work', 4, true FROM checklist_templates WHERE name = 'Standard Job Checklist'
UNION ALL
SELECT id, 'Take completion photos', 5, false FROM checklist_templates WHERE name = 'Standard Job Checklist'
UNION ALL
SELECT id, 'Customer sign-off', 6, false FROM checklist_templates WHERE name = 'Standard Job Checklist';

INSERT INTO template_items (template_id, text, sort_order, is_required)
SELECT id, 'Check paint levels', 1, true FROM checklist_templates WHERE name = 'Striper Truck Pre-Trip'
UNION ALL
SELECT id, 'Inspect spray tips', 2, true FROM checklist_templates WHERE name = 'Striper Truck Pre-Trip'
UNION ALL
SELECT id, 'Check tire pressure', 3, false FROM checklist_templates WHERE name = 'Striper Truck Pre-Trip'
UNION ALL
SELECT id, 'Test bead dispenser', 4, false FROM checklist_templates WHERE name = 'Striper Truck Pre-Trip'
UNION ALL
SELECT id, 'Verify all lights working', 5, true FROM checklist_templates WHERE name = 'Striper Truck Pre-Trip';

-- Default tags
INSERT INTO custom_tags (name, color, category) VALUES
    ('Commercial', '#3b82f6', 'customer'),
    ('Residential', '#10b981', 'customer'),
    ('Municipal', '#8b5cf6', 'customer'),
    ('Repeat Customer', '#f59e0b', 'customer'),
    ('Priority', '#ef4444', 'job'),
    ('Large Project', '#6366f1', 'job');

-- App settings
INSERT INTO app_settings (key, value) VALUES
    ('company', '{"name": "MarkPro", "phone": "", "email": "", "address": ""}'),
    ('invoice_prefix', '"INV-"'),
    ('tax_rate', '0'),
    ('field_passwords', '{"password": "markpro2025"}'),
    ('admin_passwords', '{"password": "markproadmin"}');
