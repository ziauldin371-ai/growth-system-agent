-- =============================================================================
-- GrowthSignal AI — Initial Schema Migration
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations (Multi-tenant boundary)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Profiles (Extended auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Memberships
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, profile_id)
);

-- 4. Discovery Runs
CREATE TABLE IF NOT EXISTS discovery_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    market VARCHAR(50) NOT NULL CHECK (market IN ('US', 'UK', 'CA', 'AU', 'EU', 'GLOBAL')),
    target_pipeline VARCHAR(50) NOT NULL CHECK (target_pipeline IN ('website_opportunities', 'ai_software_opportunities', 'both')),
    search_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    leads_found INTEGER NOT NULL DEFAULT 0,
    leads_qualified INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Businesses (Core Lead Entity)
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    normalized_domain VARCHAR(255),
    country VARCHAR(10) NOT NULL DEFAULT 'US',
    region VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    address TEXT,
    phone VARCHAR(50),
    industry VARCHAR(150),
    company_type VARCHAR(100),
    employee_count_range VARCHAR(50),
    annual_revenue_range VARCHAR(50),
    pipeline_type VARCHAR(50) NOT NULL DEFAULT 'unassigned' CHECK (pipeline_type IN ('website_opportunities', 'ai_software_opportunities', 'unassigned', 'disqualified')),
    qualification_status VARCHAR(50) NOT NULL DEFAULT 'unreviewed' CHECK (qualification_status IN ('unreviewed', 'qualified', 'disqualified', 'contacted', 'replied', 'closed_won')),
    discovery_run_id UUID REFERENCES discovery_runs(id) ON DELETE SET NULL,
    source_provider VARCHAR(100) NOT NULL,
    source_identifier VARCHAR(255),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_normalized_name ON businesses(normalized_name);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_domain ON businesses(normalized_domain);
CREATE INDEX IF NOT EXISTS idx_businesses_pipeline_type ON businesses(pipeline_type);
CREATE INDEX IF NOT EXISTS idx_businesses_qualification_status ON businesses(qualification_status);
CREATE INDEX IF NOT EXISTS idx_businesses_country ON businesses(country);

-- 6. Growth Evidence
CREATE TABLE IF NOT EXISTS growth_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    source_name VARCHAR(150) NOT NULL,
    source_url TEXT,
    observation_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evidence_type VARCHAR(100) NOT NULL, -- e.g., 'hiring_signal', 'new_branch', 'social_activity', 'product_launch', 'stack_detected'
    summary TEXT NOT NULL,
    is_factual BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = verified observed fact; FALSE = inference
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (confidence >= 0 AND confidence <= 1),
    freshness_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (freshness_score >= 0 AND freshness_score <= 1),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_business_id ON growth_evidence(business_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON growth_evidence(evidence_type);

-- 7. Website Verification Checks
CREATE TABLE IF NOT EXISTS website_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    domain VARCHAR(255),
    status VARCHAR(50) NOT NULL CHECK (status IN ('functional', 'apparently_absent', 'social_only', 'parked', 'broken', 'inconclusive')),
    dns_records JSONB,
    http_status_code INTEGER,
    tls_valid BOOLEAN,
    ip_address VARCHAR(100),
    is_private_ip BOOLEAN NOT NULL DEFAULT FALSE,
    redirect_chain JSONB,
    social_urls JSONB,
    page_title TEXT,
    meta_description TEXT,
    verification_latency_ms INTEGER,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_details TEXT
);

CREATE INDEX IF NOT EXISTS idx_website_checks_business_id ON website_checks(business_id);
CREATE INDEX IF NOT EXISTS idx_website_checks_status ON website_checks(status);

-- 8. Contacts
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(150),
    email VARCHAR(255),
    normalized_email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url TEXT,
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.80,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'invalid', 'role_account', 'disposable')),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_normalized_email ON contacts(normalized_email);
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON contacts(business_id);

-- 9. ICP Profiles (Ideal Customer Profiles)
CREATE TABLE IF NOT EXISTS icp_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_pipeline VARCHAR(50) NOT NULL CHECK (target_pipeline IN ('website_opportunities', 'ai_software_opportunities')),
    description TEXT,
    scoring_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    qualification_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence_threshold NUMERIC(3, 2) NOT NULL DEFAULT 0.60,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- 10. Lead Scores
CREATE TABLE IF NOT EXISTS lead_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    icp_profile_id UUID REFERENCES icp_profiles(id) ON DELETE SET NULL,
    overall_score NUMERIC(5, 2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    activity_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (activity_score >= 0 AND activity_score <= 100),
    service_fit_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (service_fit_score >= 0 AND service_fit_score <= 100),
    website_opportunity_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (website_opportunity_score >= 0 AND website_opportunity_score <= 100),
    ai_opportunity_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (ai_opportunity_score >= 0 AND ai_opportunity_score <= 100),
    contact_quality_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (contact_quality_score >= 0 AND contact_quality_score <= 100),
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT NOT NULL,
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_business_id ON lead_scores(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_overall ON lead_scores(overall_score DESC);

-- 11. Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_pipeline VARCHAR(50) NOT NULL CHECK (target_pipeline IN ('website_opportunities', 'ai_software_opportunities')),
    strategy VARCHAR(100) NOT NULL, -- e.g., 'web_development', 'ai_automation', 'rag_systems', 'python_engineering', 'data_science', 'agency_partner'
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    daily_cap INTEGER NOT NULL DEFAULT 50,
    sending_window_start INTEGER NOT NULL DEFAULT 9,
    sending_window_end INTEGER NOT NULL DEFAULT 17,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Campaign Leads
CREATE TABLE IF NOT EXISTS campaign_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'approved', 'sent', 'bounced', 'replied', 'unsubscribed', 'suppressed', 'rejected')),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, business_id)
);

-- 13. Email Drafts
CREATE TABLE IF NOT EXISTS email_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    strategy VARCHAR(100) NOT NULL,
    subject_lines JSONB NOT NULL, -- Array of 3 subject options
    selected_subject TEXT NOT NULL,
    email_body TEXT NOT NULL,
    call_to_action TEXT NOT NULL,
    service_offer TEXT NOT NULL,
    research_summary TEXT NOT NULL,
    observations JSONB NOT NULL DEFAULT '[]'::jsonb,
    rationale TEXT NOT NULL,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.85,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'sent')),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_business_id ON email_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON email_drafts(status);

-- 14. Send Events (Audit & Telemetry)
CREATE TABLE IF NOT EXISTS send_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    campaign_lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
    draft_id UUID REFERENCES email_drafts(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('attempted', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'complained', 'rejected_compliance')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_send_events_recipient ON send_events(recipient_email);
CREATE INDEX IF NOT EXISTS idx_send_events_type ON send_events(event_type);

-- 15. Suppression List
CREATE TABLE IF NOT EXISTS suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'domain', 'company')),
    value VARCHAR(255) NOT NULL,
    reason VARCHAR(100) NOT NULL CHECK (reason IN ('unsubscribe', 'hard_bounce', 'complaint', 'manual_dnc', 'legal_risk', 'competitor')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, type, value)
);

CREATE INDEX IF NOT EXISTS idx_suppression_val ON suppression_list(value);

-- 16. Automation Background Jobs (Durable Queue)
CREATE TABLE IF NOT EXISTS automation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(255) UNIQUE,
    job_type VARCHAR(100) NOT NULL, -- 'discovery_crawl', 'website_verify', 'score_leads', 'generate_draft', 'send_approved_email'
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'dead_letter')),
    priority INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_jobs_queue ON automation_jobs(status, scheduled_at, priority DESC);

-- 17. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Explicit Role Grants (Data API Exposure when "Automatically expose new tables" is OFF)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Explicit Unconditional Access Policy for Server (service_role)
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'organizations', 'profiles', 'memberships', 'discovery_runs',
        'businesses', 'growth_evidence', 'website_checks', 'contacts',
        'icp_profiles', 'lead_scores', 'campaigns', 'campaign_leads',
        'email_drafts', 'send_events', 'suppression_list', 'automation_jobs', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "service_role_all" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- Helper function to get current user organizations
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS TABLE (organization_id UUID) AS $$
    SELECT organization_id FROM memberships WHERE profile_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles: users can read their own profile and profiles in the same org
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Businesses: scoped to user's organization
CREATE POLICY "Users can read org businesses" ON businesses
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Users can insert org businesses" ON businesses
    FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Users can update org businesses" ON businesses
    FOR UPDATE USING (organization_id IN (SELECT get_user_org_ids()));

-- Campaigns: scoped to user's organization
CREATE POLICY "Users can read org campaigns" ON campaigns
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Users can manage org campaigns" ON campaigns
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Suppression List: org scoped
CREATE POLICY "Users can manage suppression" ON suppression_list
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Service role bypasses RLS for background workers automatically in Supabase
