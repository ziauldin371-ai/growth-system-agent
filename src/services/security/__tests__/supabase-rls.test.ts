import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Supabase Database RLS & Security Schema Audit across all Migrations', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  const migrationFiles = [
    '20261030000000_init_schema.sql',
    '20261030000002_alternative_channels_and_runs.sql',
    '20261030000003_realtime_discovery_and_platforms.sql',
    '20261030000004_intent_radar_and_hot_leads.sql',
  ];

  const allSqlContent = migrationFiles
    .map(file => fs.readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');

  const allTables = [
    // Migration 00
    'organizations',
    'profiles',
    'memberships',
    'discovery_runs',
    'businesses',
    'growth_evidence',
    'website_checks',
    'contacts',
    'icp_profiles',
    'lead_scores',
    'campaigns',
    'campaign_leads',
    'email_drafts',
    'send_events',
    'suppression_list',
    'automation_jobs',
    'audit_logs',
    // Migration 02
    'alternative_channels',
    'scheduler_run_history',
    // Migration 03
    'productized_offers',
    'buying_triggers',
    'proof_items',
    'domain_health_checks',
    'inbox_placement_tests',
    // Migration 04
    'intent_opportunities',
    'community_pitch_rules',
  ];

  it('enforces Row Level Security (RLS) on every single table across all migrations', () => {
    for (const table of allTables) {
      const rlsStatement = `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`;
      const hasRls = allSqlContent.includes(rlsStatement);
      expect(hasRls, `Table ${table} must have Row Level Security enabled via '${rlsStatement}'`).toBe(true);
    }
  });

  it('defines secure tenant isolation function get_user_org_ids()', () => {
    expect(allSqlContent).toContain('CREATE OR REPLACE FUNCTION get_user_org_ids()');
    expect(allSqlContent).toContain('SECURITY DEFINER');
  });

  it('enforces multi-tenant organizational isolation policies on businesses and campaigns', () => {
    expect(allSqlContent).toContain('CREATE POLICY "Users can read org businesses" ON businesses');
    expect(allSqlContent).toContain('organization_id IN (SELECT get_user_org_ids())');
    expect(allSqlContent).toContain('CREATE POLICY "Users can read org campaigns" ON campaigns');
  });

  it('verifies client-side supabase wrapper does not leak service role key', () => {
    const clientPath = path.resolve(process.cwd(), 'src/lib/supabase/client.ts');
    const clientContent = fs.readFileSync(clientPath, 'utf8');

    expect(clientContent).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(clientContent).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });
});
