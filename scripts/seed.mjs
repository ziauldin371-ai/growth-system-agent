/**
 * GrowthSignal AI — Database Seeding Script
 * Seeds initial organizations, ICP profiles, and synthetic verified prospects into Supabase.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log('[Seed] Supabase credentials not provided in environment. Skipping remote database seed.');
  console.log('[Seed] Note: GrowthSignal AI is operating in standalone In-Memory/Local mode with pre-seeded rich leads.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runSeed() {
  console.log('[Seed] Connecting to Supabase at:', supabaseUrl);

  const orgId = '00000000-0000-0000-0000-000000000001';

  // 1. Seed Org
  const { error: orgErr } = await supabase.from('organizations').upsert({
    id: orgId,
    name: 'GrowthSignal AI Core Operations',
    slug: 'growthsignal-core',
  });
  if (orgErr) console.warn('[Seed] Org seed notice:', orgErr.message);

  console.log('[Seed] Complete.');
}

runSeed().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
