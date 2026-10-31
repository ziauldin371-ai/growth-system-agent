import fs from 'fs';
import { spawnSync } from 'child_process';

/**
 * Script to securely read credentials from .env.local
 * and add them to Vercel for both Production and Preview environments
 * using stdin piping (never printing or echoing secret values).
 */

function main() {
  console.log('=== VERCEL CREDENTIALS SYNC ===\n');

  if (!fs.existsSync('.env.local')) {
    console.error('Error: .env.local file not found.');
    process.exit(1);
  }

  const envContent = fs.readFileSync('.env.local', 'utf8');

  const targets = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET',
    'ENCRYPTION_SECRET',
    'UNSUBSCRIBE_SECRET'
  ];

  const extracted = {};

  for (const name of targets) {
    const regex = new RegExp(`^${name}=(.*)$`, 'm');
    const match = envContent.match(regex);
    if (match && match[1].trim().length > 0) {
      extracted[name] = match[1].trim();
    }
  }

  // Also check ADMIN_PASSWORD for production
  const adminPassMatch = envContent.match(/^ADMIN_PASSWORD=(.*)$/m);
  if (adminPassMatch && adminPassMatch[1].trim().length > 0) {
    extracted['ADMIN_PASSWORD'] = adminPassMatch[1].trim();
  }

  console.log('Variables extracted from .env.local (names only):');
  Object.keys(extracted).forEach(k => console.log(`  ✓ ${k}`));

  const environments = ['production', 'preview'];

  for (const env of environments) {
    console.log(`\n--- Syncing variables to Vercel [${env}] ---`);
    for (const name of targets) {
      const val = extracted[name];
      if (!val) continue;
      console.log(`Piping ${name} to Vercel (${env})...`);

      const res = spawnSync('vercel.cmd', ['env', 'add', name, env, '--force'], {
        input: val + '\n',
        encoding: 'utf8',
        shell: true
      });

      if (res.status === 0) {
        console.log(`  ✓ Successfully added ${name} to ${env}`);
      } else {
        console.warn(`  Notice on ${name} (${env}): ${res.stderr ? res.stderr.split('\n')[0] : 'non-zero exit'}`);
      }
    }
  }

  // Ensure ADMIN_PASSWORD is in production as well
  if (extracted['ADMIN_PASSWORD']) {
    console.log(`\nPiping ADMIN_PASSWORD to Vercel (production)...`);
    const res = spawnSync('vercel.cmd', ['env', 'add', 'ADMIN_PASSWORD', 'production', '--force'], {
      input: extracted['ADMIN_PASSWORD'] + '\n',
      encoding: 'utf8',
      shell: true
    });
    if (res.status === 0) {
      console.log(`  ✓ Successfully added ADMIN_PASSWORD to production`);
    } else {
      console.warn(`  Notice on ADMIN_PASSWORD (production): ${res.stderr ? res.stderr.split('\n')[0] : 'non-zero exit'}`);
    }
  }

  console.log('\n=== VERCEL SYNC COMPLETE ===');
}

main();
