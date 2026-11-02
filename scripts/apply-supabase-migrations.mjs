import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 1. Load environment from .env.local if present
function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const projectRef = process.env.SUPABASE_PROJECT_REF || 'lajquqdzqfbhnunftgbn';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${projectRef}.supabase.co`;

export async function executeQuery(query) {
  if (!accessToken) {
    throw new Error(
      'SUPABASE_ACCESS_TOKEN is missing from .env.local.\n' +
      'Please add SUPABASE_ACCESS_TOKEN=<your_token> to .env.local.\n' +
      'Fallback: If using direct Postgres connection, set SUPABASE_DB_PASSWORD in .env.local.'
    );
  }

  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson.message || errJson.error || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(`Management API error (HTTP ${res.status}): ${errorDetail}`);
  }

  return await res.json();
}

function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// Check for dangerous DROP or TRUNCATE in SQL (excluding DROP POLICY, DROP TRIGGER, DROP INDEX IF EXISTS)
function findDangerousStatements(sql) {
  const dangerous = [];
  const lines = sql.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;
    
    // Check for DROP TABLE, DROP SCHEMA, DROP DATABASE, TRUNCATE
    if (/\bDROP\s+TABLE\b/i.test(line) || /\bDROP\s+SCHEMA\b/i.test(line) || /\bDROP\s+DATABASE\b/i.test(line)) {
      dangerous.push(`Line ${i + 1}: ${trimmed}`);
    }
    if (/\bTRUNCATE\b/i.test(line)) {
      dangerous.push(`Line ${i + 1}: ${trimmed}`);
    }
  }
  return dangerous;
}

function makeIdempotent(sql) {
  // Prepend DROP POLICY IF EXISTS before CREATE POLICY to avoid 42710 (policy already exists)
  // Handles both quoted names with spaces and unquoted identifiers
  return sql.replace(/CREATE\s+POLICY\s+("(?:[^"]+)"|(?:\S+))\s+ON\s+(\S+)/gi, (match, policyName, tableName) => {
    return `DROP POLICY IF EXISTS ${policyName} ON ${tableName};\n${match}`;
  });
}

export async function runMigrations({ dryRun = false, allowDangerous = false } = {}) {
  console.log('=== SUPABASE AUTOMATED MIGRATION RUNNER ===');
  console.log(`Target project: ${projectRef}`);
  console.log(`Database URL: ${supabaseUrl}`);
  console.log(`SUPABASE_ACCESS_TOKEN: ${accessToken ? 'CONFIGURED' : 'NOT SET'}`);
  console.log('');

  // 1. Verify connection
  const testRes = await executeQuery('SELECT current_database(), current_user, version();');
  console.log(`Connected to database: ${testRes[0]?.current_database} as user: ${testRes[0]?.current_user}`);

  // 2. Ensure schema_migrations table exists
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      checksum TEXT NOT NULL
    );
    ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'schema_migrations' AND policyname = 'service_role_manage_migrations'
      ) THEN
        CREATE POLICY service_role_manage_migrations ON public.schema_migrations FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);

  // 3. Query existing applied migrations
  const appliedRows = await executeQuery('SELECT filename, applied_at, checksum FROM public.schema_migrations ORDER BY filename ASC;');
  const appliedMap = new Map();
  for (const row of appliedRows) {
    appliedMap.set(row.filename, row);
  }

  // 4. Query existing public tables to detect already effectively applied migrations
  const existingTablesRes = await executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  const existingTables = new Set(existingTablesRes.map(r => r.table_name));
  console.log(`Existing tables in public schema (${existingTables.size}):`);
  console.log(Array.from(existingTables).sort().join(', '));
  console.log('');

  // 5. Read all migrations in filename order
  const migrationsDir = path.resolve('supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files in supabase/migrations.\n`);

  // Signature map: key table indicating migration was already effectively applied prior to schema_migrations
  const migrationSignatures = {
    '20261030000000_init_schema.sql': 'businesses',
    '20261030000001_seed_icp_profiles.sql': 'icp_profiles',
    '20261030000002_alternative_channels_and_runs.sql': 'scheduler_run_history',
    '20261030000003_realtime_discovery_and_platforms.sql': 'discovery_runs',
    '20261030000004_intent_radar_and_hot_leads.sql': 'intent_opportunities',
    '20261030000005_rls_multi_tenant_complete_and_oauth.sql': 'oauth_tokens',
    '20261030000006_distributed_locks_and_checkpoints.sql': 'distributed_locks',
    '20261031000000_platforms_engine_and_applications.sql': 'vetted_applications',
    '20261031000001_explicit_grants_and_rls_lockdown.sql': 'vetted_applications',
    '20261101000000_platforms_tracker_and_profile.sql': 'platform_tracker',
    '20261102000000_client_requests_and_sources.sql': 'client_requests',
  };

  const results = [];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = calculateChecksum(content);

    if (appliedMap.has(file)) {
      results.push({ file, status: 'ALREADY_APPLIED', details: 'Found in schema_migrations' });
      continue;
    }

    // Check if effectively already applied by table existence
    const signatureTable = migrationSignatures[file];
    if (signatureTable && existingTables.has(signatureTable)) {
      // Record in schema_migrations so future runs skip immediately
      await executeQuery(`
        INSERT INTO public.schema_migrations (filename, checksum)
        VALUES ('${file}', '${checksum}')
        ON CONFLICT (filename) DO NOTHING;
      `);
      results.push({ file, status: 'RECORDED_EXISTING', details: `Table '${signatureTable}' already exists in DB` });
      continue;
    }

    // Check for dangerous statements
    const dangerous = findDangerousStatements(content);
    if (dangerous.length > 0 && !allowDangerous) {
      console.error(`\n[SAFETY STOP] Migration ${file} contains destructive statement(s):`);
      dangerous.forEach(d => console.error(`  ${d}`));
      results.push({ file, status: 'BLOCKED_DANGEROUS', details: dangerous });
      throw new Error(`Safety stop: destructive statement in ${file}. Execution aborted without running.`);
    }

    if (dryRun) {
      results.push({ file, status: 'PENDING_DRY_RUN', details: 'Would apply in transaction' });
      continue;
    }

    console.log(`Applying migration: ${file}...`);
    // Make policies idempotent
    const safeContent = makeIdempotent(content);
    // Wrap entire file inside transaction
    const wrappedSql = `BEGIN;\n${safeContent}\nINSERT INTO public.schema_migrations (filename, checksum) VALUES ('${file}', '${checksum}');\nCOMMIT;`;
    
    try {
      await executeQuery(wrappedSql);
      console.log(`  -> Successfully applied ${file}`);
      results.push({ file, status: 'APPLIED', details: 'Executed successfully' });
      // Update our existing tables set with new tables created
      const refreshedTables = await executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
      refreshedTables.forEach(r => existingTables.add(r.table_name));
    } catch (err) {
      console.error(`\n[ERROR] Failed to apply ${file}:`);
      console.error(err.message);
      results.push({ file, status: 'FAILED', details: err.message });
      throw err;
    }
  }

  // Reload PostgREST schema cache
  console.log('\nReloading PostgREST schema cache (NOTIFY pgrst)...');
  await executeQuery("NOTIFY pgrst, 'reload schema';");
  console.log('PostgREST schema cache reloaded successfully.');

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('apply-supabase-migrations.mjs')) {
  const allowDangerous = process.argv.includes('--allow-dangerous');
  const dryRun = process.argv.includes('--dry-run');

  runMigrations({ allowDangerous, dryRun })
    .then(results => {
      console.log('\n=== MIGRATION SUMMARY ===');
      console.table(results.map(r => ({
        File: r.file,
        Status: r.status,
        Details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details)
      })));
    })
    .catch(err => {
      console.error('\nMigration runner failed:');
      console.error(err.message);
      process.exit(1);
    });
}
