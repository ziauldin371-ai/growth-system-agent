import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Supabase Database RLS & Security Schema Audit', () => {
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261030000000_init_schema.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  it('enables Row Level Security on all critical tables in the migration', () => {
    const requiredTablesWithRls = [
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
    ];

    for (const table of requiredTablesWithRls) {
      const rlsStatement = `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`;
      expect(sqlContent).toContain(rlsStatement);
    }
  });

  it('defines secure tenant isolation function get_user_org_ids()', () => {
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION get_user_org_ids()');
    expect(sqlContent).toContain('SECURITY DEFINER');
  });

  it('enforces multi-tenant organizational isolation on businesses and campaigns', () => {
    expect(sqlContent).toContain('CREATE POLICY "Users can read org businesses" ON businesses');
    expect(sqlContent).toContain('organization_id IN (SELECT get_user_org_ids())');
    expect(sqlContent).toContain('CREATE POLICY "Users can read org campaigns" ON campaigns');
  });

  it('verifies client-side supabase wrapper does not leak service role key', () => {
    const clientPath = path.resolve(process.cwd(), 'src/lib/supabase/client.ts');
    const clientContent = fs.readFileSync(clientPath, 'utf8');

    expect(clientContent).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(clientContent).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });
});

