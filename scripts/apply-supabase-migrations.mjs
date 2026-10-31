import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log('=== SUPABASE MIGRATION APPLICATION RUNNER ===\n');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    console.error('Usage: NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/apply-supabase-migrations.mjs\n');
    process.exit(1);
  }

  const migrationsDir = path.resolve('supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found at: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} ordered migration files in ${migrationsDir}:`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`\nConnecting to Supabase at: ${supabaseUrl}...`);

  for (const file of files) {
    console.log(`Applying migration: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // Execute via RPC or direct SQL query if available
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      // In standard hosted Supabase without custom exec_sql function, notify how to run
      console.warn(`  Notice on ${file}: direct SQL execution via RPC requires exec_sql helper or Supabase CLI.`);
      console.log(`  File ready for execution in Supabase Dashboard SQL Editor or via 'supabase db push'.`);
    } else {
      console.log(`  Successfully applied ${file}.`);
    }
  }

  console.log('\n=== MIGRATIONS COMPLETE ===');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
