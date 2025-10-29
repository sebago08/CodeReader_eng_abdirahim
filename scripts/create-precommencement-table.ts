import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.log('Supabase not configured, skipping...');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createTable() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      CREATE TABLE IF NOT EXISTS pre_commencement_items (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        item_name VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        deadline VARCHAR,
        date_submitted VARCHAR,
        responsible_party VARCHAR,
        notes TEXT,
        file_url VARCHAR,
        is_default BOOLEAN DEFAULT false,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
  });

  if (error) {
    console.error('Error creating table:', error);
    // Try alternative method using direct SQL
    const { error: altError } = await supabase.from('pre_commencement_items').select('*').limit(0);
    if (altError && altError.code === '42P01') {
      console.log('Table does not exist in Supabase. Please create it manually in Supabase SQL Editor with the following SQL:');
      console.log(`
CREATE TABLE IF NOT EXISTS pre_commencement_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_name VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  deadline VARCHAR,
  date_submitted VARCHAR,
  responsible_party VARCHAR,
  notes TEXT,
  file_url VARCHAR,
  is_default BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
      `);
    }
  } else {
    console.log('Table created successfully in Supabase');
  }
}

createTable().catch(console.error);
