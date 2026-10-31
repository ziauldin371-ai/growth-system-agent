-- ==============================================================================
-- GROWTH SYSTEM AGENT: Migration 08
-- Explicit Role Grants, Automatic RLS Enforcement, and Anonymous Access Lockdown
-- Compatible with Supabase "Automatically expose new tables = OFF" and "Automatic RLS = ON"
-- ==============================================================================

-- 1. Schema-Level Grants for Data API (PostgREST)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- Revoke default privileges from anon to enforce zero anonymous exposure
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;

-- 2. Explicit Grants and RLS per Table (All 35 Tables)
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
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
        'platform_spend_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Verify table exists before altering
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Enable Row Level Security
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

            -- Explicit Grants for Server (service_role)
            EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role;', tbl);

            -- Explicit Grants for Authenticated Users (controlled strictly by RLS policies)
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', tbl);

            -- Revoke ALL access from Anonymous users (anon key cannot access or read any table)
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', tbl);

            -- Explicit Unrestricted Policy for Server (service_role)
            EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON public.%I;', tbl);
            EXECUTE format('CREATE POLICY "service_role_all" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl);
        END IF;
    END LOOP;
END $$;

-- 3. Explicit Multi-Tenant RLS Policies for Authenticated Operators
-- Ensuring authenticated operators can access their organization's records

-- Platforms & Reference Rules: Read-only for authenticated operators
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platforms') THEN
        DROP POLICY IF EXISTS "authenticated_read_platforms" ON public.platforms;
        CREATE POLICY "authenticated_read_platforms" ON public.platforms FOR SELECT TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'productized_offers') THEN
        DROP POLICY IF EXISTS "authenticated_read_offers" ON public.productized_offers;
        CREATE POLICY "authenticated_read_offers" ON public.productized_offers FOR SELECT TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proof_items') THEN
        DROP POLICY IF EXISTS "authenticated_read_proof" ON public.proof_items;
        CREATE POLICY "authenticated_read_proof" ON public.proof_items FOR SELECT TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_pitch_rules') THEN
        DROP POLICY IF EXISTS "authenticated_read_rules" ON public.community_pitch_rules;
        CREATE POLICY "authenticated_read_rules" ON public.community_pitch_rules FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

