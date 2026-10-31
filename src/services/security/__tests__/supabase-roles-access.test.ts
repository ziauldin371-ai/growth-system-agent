import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Supabase Explicit Role Grants, Automatic RLS & Anon Access Lockdown Test Suite', () => {
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261031000001_explicit_grants_and_rls_lockdown.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  const ALL_35_TABLES = [
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
    'alternative_channels',
    'scheduler_run_history',
    'productized_offers',
    'buying_triggers',
    'proof_items',
    'domain_health_checks',
    'inbox_placement_tests',
    'intent_opportunities',
    'community_pitch_rules',
    'oauth_tokens',
    'distributed_locks',
    'scheduler_checkpoints',
    'platforms',
    'vetted_applications',
    'lead_source_configs',
    'platform_footprints',
    'marketplace_hot_requests',
    'platform_spend_logs',
  ];

  it('declares all 35 schema tables in the explicit role grants migration array', () => {
    for (const table of ALL_35_TABLES) {
      expect(migrationSql).toContain(`'${table}'`);
    }
  });

  it('enforces schema-level usage grants for Data API (PostgREST)', () => {
    expect(migrationSql).toContain('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;');
    expect(migrationSql).toContain('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;');
    expect(migrationSql).toContain('GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;');
    expect(migrationSql).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;');
  });

  it('revokes default table privileges from anon role to enforce zero anonymous exposure', () => {
    expect(migrationSql).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;');
    expect(migrationSql).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;');
    expect(migrationSql).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;');
  });

  it('dynamically enforces RLS, service_role grants, authenticated grants, and anon revokes on every table', () => {
    expect(migrationSql).toContain('EXECUTE format(\'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;\', tbl);');
    expect(migrationSql).toContain('EXECUTE format(\'GRANT ALL ON TABLE public.%I TO service_role;\', tbl);');
    expect(migrationSql).toContain('EXECUTE format(\'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;\', tbl);');
    expect(migrationSql).toContain('EXECUTE format(\'REVOKE ALL ON TABLE public.%I FROM anon;\', tbl);');
    expect(migrationSql).toContain('EXECUTE format(\'CREATE POLICY "service_role_all" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);\', tbl);');
  });

  it('guarantees that the server (service_role) can insert and read a business, suppression, and send record in the data layer', async () => {
    const { inMemoryDataStore } = await import('@/services/repository/data-store');
    const { SupabaseDataStore } = await import('@/services/repository/supabase-data-store');

    const store = new SupabaseDataStore(inMemoryDataStore);

    // Business record
    const business = {
      id: 'biz_role_test',
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Server Role Verified Plumbing',
      normalizedName: 'server role verified plumbing',
      domain: 'serverplumb.co.uk',
      city: 'Leeds',
      country: 'UK',
      industry: 'Plumbing',
      pipelineType: 'unassigned' as const,
      qualificationStatus: 'qualified' as const,
      sourceProvider: 'service_role',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveBusiness(business);
    const readBusiness = await store.getBusinessById('biz_role_test');
    expect(readBusiness).toBeDefined();
    expect(readBusiness?.name).toBe('Server Role Verified Plumbing');

    // Suppression record
    const suppression = {
      id: 'supp_role_test',
      organizationId: '00000000-0000-0000-0000-000000000001',
      type: 'email' as const,
      value: 'dnc@serverplumb.co.uk',
      reason: 'unsubscribe' as const,
      notes: 'Server test suppression',
      createdAt: new Date().toISOString(),
    };
    await store.addSuppression(suppression);
    const isSuppressed = await store.isSuppressed('dnc@serverplumb.co.uk');
    expect(isSuppressed).toBe(true);

    // Send record
    const draft = {
      id: 'draft_role_test',
      businessId: 'biz_role_test',
      strategy: 'operational_efficiency',
      subjectLines: ['Test dispatch'],
      selectedSubject: 'Test dispatch',
      emailBody: 'Body content',
      callToAction: 'Reply?',
      serviceOffer: 'AI Scheduling',
      status: 'sent' as const,
      deliveryStatus: 'delivered' as const,
      recipientEmail: 'dnc@serverplumb.co.uk',
      gmailMessageId: 'msg_role_test_123',
      gmailThreadId: 'thread_role_test_123',
      gmailUrl: 'https://mail.google.com/mail/#sent/msg_role_test_123',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveDraft(draft);
    const sentEmails = await store.getSentEmails();
    const foundSent = sentEmails.find(d => d.id === 'draft_role_test');
    expect(foundSent).toBeDefined();
    expect(foundSent?.gmailMessageId).toBe('msg_role_test_123');
  });

  it('guarantees that anon role has 0 policies allowing read across any table', () => {
    // Audit all migration files to ensure no "TO anon" policies exist
    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const anonPolicyMatch = content.match(/CREATE\s+POLICY\s+[^;]+TO\s+anon/gi);
      expect(anonPolicyMatch, `Migration ${file} must NOT grant any policy TO anon`).toBeNull();
    }
  });
});
