import { createClient } from '@supabase/supabase-js';

const PROD_SUPABASE_HOST = 'lajquqdzqfbhnunftgbn.supabase.co';

export function isProdSupabaseUrl(url?: string): boolean {
  if (!url) return false;
  return url.toLowerCase().includes(PROD_SUPABASE_HOST);
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  // Guard: Refuse to connect test suite or unauthorized test scripts to production Supabase database
  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  if (isTestEnv && isProdSupabaseUrl(supabaseUrl) && process.env.ALLOW_PROD_TEST_WRITES !== 'true') {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

