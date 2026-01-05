#!/usr/bin/env node

/**
 * Database Setup Script
 * This script sets up job stages, sample data, and RLS policies for MarkProNext1
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment or .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  // Step 1: Create job stages
  console.log('📋 Creating job stages...');
  const stages = [
    { name: 'New', color: '#64748b', sort_order: 0, is_field_visible: false, is_active: true },
    { name: 'Scheduled', color: '#3b82f6', sort_order: 1, is_field_visible: true, is_active: true },
    { name: 'On Route', color: '#8b5cf6', sort_order: 2, is_field_visible: true, is_active: true },
    { name: 'In Progress', color: '#f59e0b', sort_order: 3, is_field_visible: true, is_active: true },
    { name: 'Completed', color: '#10b981', sort_order: 4, is_field_visible: true, is_active: true },
    { name: 'Cancelled', color: '#ef4444', sort_order: 5, is_field_visible: false, is_active: true },
  ];

  for (const stage of stages) {
    const { data: existing } = await supabase
      .from('job_stages')
      .select('id')
      .eq('name', stage.name)
      .single();

    if (!existing) {
      const { error } = await supabase.from('job_stages').insert(stage);
      if (error) {
        console.error(`   ❌ Failed to create stage "${stage.name}":`, error.message);
      } else {
        console.log(`   ✅ Created stage: ${stage.name}`);
      }
    } else {
      console.log(`   ℹ️  Stage already exists: ${stage.name}`);
    }
  }

  // Step 2: Check current data
  console.log('\n📊 Checking current database state...');

  const { data: stagesData } = await supabase.from('job_stages').select('id, name, is_field_visible');
  console.log(`   Stages: ${stagesData?.length || 0} total, ${stagesData?.filter(s => s.is_field_visible).length || 0} field-visible`);

  const { count: jobsCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
  console.log(`   Jobs: ${jobsCount || 0}`);

  const { count: tasksCount } = await supabase.from('shop_tasks').select('*', { count: 'exact', head: true });
  console.log(`   Shop Tasks: ${tasksCount || 0}`);

  // Step 3: Create sample data if needed
  if (jobsCount === 0) {
    console.log('\n📝 Creating sample data...');

    // Create customer
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .insert({ name: 'John Smith', company: 'ABC Company', email: 'john@abc.com', phone: '555-0100' })
      .select()
      .single();

    if (custError) {
      console.error('   ❌ Failed to create customer:', custError.message);
    } else {
      console.log('   ✅ Created sample customer');

      // Get scheduled stage
      const { data: scheduledStage } = await supabase
        .from('job_stages')
        .select('id')
        .eq('name', 'Scheduled')
        .single();

      if (scheduledStage && customer) {
        // Create sample job
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { error: jobError } = await supabase.from('jobs').insert({
          name: 'Sample Roofing Job',
          job_address_street: '123 Main St',
          job_address_city: 'Springfield',
          job_address_state: 'IL',
          job_address_zip: '62701',
          stage_id: scheduledStage.id,
          customer_id: customer.id,
          scheduled_date: tomorrow.toISOString().split('T')[0],
          scheduled_time_start: '09:00',
        });

        if (jobError) {
          console.error('   ❌ Failed to create job:', jobError.message);
        } else {
          console.log('   ✅ Created sample job');
        }
      }
    }
  }

  if (tasksCount === 0) {
    console.log('\n🔧 Creating sample shop tasks...');

    const tasks = [
      {
        title: 'Oil Change - Truck #1',
        description: 'Regular maintenance oil change',
        task_type: 'maintenance',
        status: 'pending',
        priority: 2,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        title: 'Brake Inspection - Van #2',
        description: 'Check brake pads and rotors',
        task_type: 'inspection',
        status: 'pending',
        priority: 1,
        due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        title: 'Engine Repair - Truck #3',
        description: 'Investigate unusual engine noise',
        task_type: 'repair',
        status: 'in_progress',
        priority: 3,
        due_date: new Date().toISOString().split('T')[0],
      },
    ];

    const { error: tasksError } = await supabase.from('shop_tasks').insert(tasks);
    if (tasksError) {
      console.error('   ❌ Failed to create tasks:', tasksError.message);
    } else {
      console.log(`   ✅ Created ${tasks.length} sample tasks`);
    }
  }

  console.log('\n✅ Database setup complete!');
  console.log('\n📌 Next steps:');
  console.log('   1. Go to Supabase Dashboard → SQL Editor');
  console.log('   2. Run the RLS policy update from APPLY_THIS_MIGRATION.sql');
  console.log('   3. Refresh your app diagnostic page');
}

setupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
