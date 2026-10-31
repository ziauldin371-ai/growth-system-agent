import fs from 'fs';
import { spawnSync } from 'child_process';

/**
 * Script to securely read Supabase credentials from .env.local
 * and add them to Vercel for both Production and Preview environments
 * using stdin piping (never printing or echoing secret values).
 */

function main() {
  console.log('=== VERCEL SUPABASE CREDENTIALS SYNC ===\n');

  if (!fs.existsSync('.env.local')) {
    console.error('Error: .env.local file not found.');
    process.exit(1);
  }

  const envContent = fs.readFileSync('.env.local', 'utf8');

  const targets = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const extracted = {};

  for (const name of targets) {
    const regex = new RegExp(`^${name}=(.*)$`, 'm');
    const match = envContent.match(regex);
    if (match && match[1].trim().length > 0) {
      extracted[name] = match[1].trim();
    }
  }

  const missing = targets.filter(t => !extracted[t]);

  if (missing.length > 0) {
    console.warn('Notice: The following Supabase variables are not yet present in .env.local:');
    missing.forEach(m => console.warn(`  - ${m}`));
    console.warn('\nPlease ensure you have saved (Ctrl+S) your .env.local file with these variables.\n');
    return;
  }

  console.log('Found all required variables in .env.local:');
  targets.forEach(t => console.log(`  ✓ ${t}`));

  const environments = ['production', 'preview'];

  for (const env of environments) {
    console.log(`\nAdding variables to Vercel environment: [${env}]...`);
    for (const name of targets) {
      const val = extracted[name];
      console.log(`  Piping ${name} to Vercel (${env})...`);

      // Execute vercel env add piping value via stdin
      const res = spawnSync('npx', ['vercel', 'env', 'add', name, env, '--force'], {
        input: val,
        encoding: 'utf8',
        shell: true
      });

      if (res.status === 0) {
        console.log(`  ✓ Successfully added ${name} to ${env}`);
      } else {
        console.warn(`  Notice on ${name} (${env}): ${res.stderr ? res.stderr.split('\n')[0] : 'requires interactive login'}`);
      }
    }
  }

  console.log('\n=== VERCEL SYNC COMPLETE ===');
}

main();

