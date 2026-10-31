-- =============================================================================
-- GrowthSignal AI â€” Initial Schema Migration
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
-- =============================================================================
-- GrowthSignal AI â€” Seed 7 Default Ideal Customer Profiles (ICPs)
-- =============================================================================

INSERT INTO icp_profiles (
    organization_id,
    slug,
    name,
    target_pipeline,
    description,
    confidence_threshold,
    scoring_weights,
    qualification_criteria,
    is_active
) VALUES
-- 1. Growing local businesses without functional websites
(
    '00000000-0000-0000-0000-000000000001',
    'local-business-no-website',
    'Growing Local Businesses Without Functional Websites',
    'website_opportunities',
    'Active, verified commercial businesses operating with physical footprints, active customer reviews, or social channels but lacking a verified functional domain or website.',
    0.65,
    '{"no_website_weight": 0.40, "commercial_activity_weight": 0.30, "contact_availability_weight": 0.20, "review_growth_weight": 0.10}'::jsonb,
    '{"require_commercial_activity": true, "require_no_functional_website": true, "min_reviews_or_posts": 3}'::jsonb,
    true
),
-- 2. SaaS startups needing MVPs or engineering capacity
(
    '00000000-0000-0000-0000-000000000001',
    'saas-mvp-engineering-capacity',
    'SaaS Startups Needing MVPs or Engineering Capacity',
    'ai_software_opportunities',
    'Early-stage or funded software startups showing evidence of technical backlog, active product iteration, public hiring for developers, or modern SaaS stack evolution.',
    0.70,
    '{"saas_business_model_weight": 0.35, "engineering_demand_weight": 0.35, "recent_funding_or_launch_weight": 0.20, "contact_seniority_weight": 0.10}'::jsonb,
    '{"target_company_types": ["SaaS", "B2B Software", "Product Startup"], "min_team_size": 2, "max_team_size": 50}'::jsonb,
    true
),
-- 3. Companies with manual workflows suitable for automation
(
    '00000000-0000-0000-0000-000000000001',
    'manual-workflow-automation',
    'Businesses with High-Touch Operations Seeking Automation',
    'ai_software_opportunities',
    'Logistics, professional services, healthcare, or agencies showing operational complexity (manual intake, repetitive customer service, PDF/document handling).',
    0.60,
    '{"operational_complexity_weight": 0.40, "process_volume_signal_weight": 0.30, "decision_maker_contact_weight": 0.20, "growth_velocity_weight": 0.10}'::jsonb,
    '{"industries": ["Logistics", "Legal", "Real Estate", "Financial Services", "Healthcare", "Consulting"]}'::jsonb,
    true
),
-- 4. Businesses seeking AI assistants, LLM integrations, RAG, or document intelligence
(
    '00000000-0000-0000-0000-000000000001',
    'ai-llm-rag-integrations',
    'Companies Exploring AI / LLM / RAG Solutions',
    'ai_software_opportunities',
    'Companies publishing job openings or press mentions referencing AI, GenAI, chatbots, vector search, knowledge retrieval, or document processing.',
    0.70,
    '{"ai_keywords_presence_weight": 0.45, "unstructured_data_volume_weight": 0.25, "tech_maturity_weight": 0.20, "growth_weight": 0.10}'::jsonb,
    '{"keywords": ["LLM", "RAG", "AI Assistant", "Document Intelligence", "OpenAI", "LangChain", "Vector Database"]}'::jsonb,
    true
),
-- 5. Companies needing data pipelines, reporting, forecasting, or analytics
(
    '00000000-0000-0000-0000-000000000001',
    'data-engineering-analytics',
    'Organizations Needing Data Pipelines & Python Analytics',
    'ai_software_opportunities',
    'E-commerce, FinTech, and mid-market companies scaling data volume without dedicated in-house data engineering teams.',
    0.65,
    '{"data_volume_signals_weight": 0.40, "python_stack_affinity_weight": 0.30, "reporting_friction_signals_weight": 0.20, "budget_fit_weight": 0.10}'::jsonb,
    '{"keywords": ["ETL", "Data Pipeline", "BigQuery", "Snowflake", "Forecasting", "Dashboard", "Python"]}'::jsonb,
    true
),
-- 6. Digital agencies requiring white-label development partners
(
    '00000000-0000-0000-0000-000000000001',
    'agency-white-label-partner',
    'Digital Agencies Needing AI & Full-Stack White-Label Partners',
    'ai_software_opportunities',
    'Design, marketing, and SEO agencies that sell web and AI solutions to their clients but need an elite senior technical implementation partner.',
    0.70,
    '{"agency_model_weight": 0.45, "client_project_volume_weight": 0.30, "executive_reachability_weight": 0.15, "portfolio_breadth_weight": 0.10}'::jsonb,
    '{"industries": ["Marketing Agency", "Creative Agency", "SEO Agency", "Management Consulting"]}'::jsonb,
    true
),
-- 7. Companies showing credible public hiring signals or documented technical requirements
(
    '00000000-0000-0000-0000-000000000001',
    'public-hiring-signals',
    'Companies with Active Software/AI Job Openings',
    'ai_software_opportunities',
    'Businesses actively advertising for Python engineers, full-stack developers, AI architects, or data engineersâ€”where an external contractor/consultant provides immediate velocity.',
    0.75,
    '{"job_posting_freshness_weight": 0.40, "role_alignment_weight": 0.35, "company_size_weight": 0.15, "speed_to_hire_friction_weight": 0.10}'::jsonb,
    '{"target_roles": ["Full Stack Engineer", "Python Developer", "AI Engineer", "Data Scientist", "DevOps Engineer"]}'::jsonb,
    true
)
ON CONFLICT (organization_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    scoring_weights = EXCLUDED.scoring_weights,
    qualification_criteria = EXCLUDED.qualification_criteria,
    confidence_threshold = EXCLUDED.confidence_threshold;
-- =============================================================================
-- Growth System Agent â€” Migration: Alternative Channels & Scheduler Runs
-- =============================================================================

-- 1. Alternative Outreach Channels Table
CREATE TABLE IF NOT EXISTS alternative_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'contact_form', 'instagram', 'facebook', 'twitter', 'youtube', 'directory', 'other')),
    profile_url TEXT NOT NULL,
    handle_or_identifier VARCHAR(255),
    source_name VARCHAR(100) NOT NULL,
    source_url TEXT,
    is_usable BOOLEAN NOT NULL DEFAULT true,
    custom_pitch TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'not_contacted' CHECK (status IN ('not_contacted', 'manually_contacted', 'replied', 'not_applicable')),
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contacted_at TIMESTAMPTZ,
    reminder_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alternative_channels_business ON alternative_channels(business_id);
CREATE INDEX IF NOT EXISTS idx_alternative_channels_platform ON alternative_channels(platform);
CREATE INDEX IF NOT EXISTS idx_alternative_channels_status ON alternative_channels(status);
CREATE INDEX IF NOT EXISTS idx_alternative_channels_reminder ON alternative_channels(reminder_date);

-- 2. Enhance Email Drafts with Gmail Tracking Columns
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS gmail_message_id VARCHAR(255);
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS gmail_thread_id VARCHAR(255);
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS gmail_url TEXT;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_email_drafts_gmail_msg ON email_drafts(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_sent_at ON email_drafts(sent_at);

-- 3. Scheduler Run History Table
CREATE TABLE IF NOT EXISTS scheduler_run_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(100) NOT NULL UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('completed', 'skipped', 'failed')),
    start_time_pkt VARCHAR(100) NOT NULL,
    finish_time_pkt VARCHAR(100) NOT NULL,
    start_time_utc TIMESTAMPTZ NOT NULL,
    finish_time_utc TIMESTAMPTZ NOT NULL,
    countries_searched JSONB NOT NULL DEFAULT '[]'::jsonb,
    sources_searched JSONB NOT NULL DEFAULT '[]'::jsonb,
    leads_discovered INTEGER NOT NULL DEFAULT 0,
    leads_qualified INTEGER NOT NULL DEFAULT 0,
    drafts_generated INTEGER NOT NULL DEFAULT 0,
    emails_sent INTEGER NOT NULL DEFAULT 0,
    skipped_records_count INTEGER NOT NULL DEFAULT 0,
    skipped_reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
    alternative_channels_found INTEGER NOT NULL DEFAULT 0,
    operating_mode VARCHAR(50) NOT NULL,
    reason TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    next_scheduled_run_pkt VARCHAR(100),
    next_scheduled_run_utc TIMESTAMPTZ,
    notification_status VARCHAR(50) DEFAULT 'sent',
    errors JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_run_history_created ON scheduler_run_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_run_history_status ON scheduler_run_history(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE alternative_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_run_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read alternative channels"
    ON alternative_channels FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM memberships WHERE profile_id = auth.uid()
    ));

CREATE POLICY "Org members can modify alternative channels"
    ON alternative_channels FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM memberships WHERE profile_id = auth.uid()
    ));

CREATE POLICY "Org members can read run history"
    ON scheduler_run_history FOR SELECT
    USING (organization_id IS NULL OR organization_id IN (
        SELECT organization_id FROM memberships WHERE profile_id = auth.uid()
    ));

CREATE POLICY "Org members can modify run history"
    ON scheduler_run_history FOR ALL
    USING (organization_id IS NULL OR organization_id IN (
        SELECT organization_id FROM memberships WHERE profile_id = auth.uid()
    ));

-- =============================================================================
-- Growth System Agent â€” Migration 03: Real-Time Discovery, Deliverability & Multi-Platform Outreach
-- =============================================================================

-- 1. Enhance Businesses table for real-time freshness, closed detection, and heat score
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS raw_payload_ref JSONB DEFAULT '{}'::jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_permanently_closed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS heat_score NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trigger_freshness_rank NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS decision_maker_role VARCHAR(150);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS decision_maker_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_businesses_fetched_at ON businesses(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_heat_score ON businesses(heat_score DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_is_closed ON businesses(is_permanently_closed);

-- 2. Enhance Email Drafts for Gmail Sent Confirmation & Quality Gate Check
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS gmail_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS gmail_labels JSONB DEFAULT '[]'::jsonb;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS confirmed_sent_at TIMESTAMPTZ;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS reconciled_status VARCHAR(50) DEFAULT 'draft' CHECK (reconciled_status IN ('draft', 'uncertain', 'sent_confirmed', 'failed'));
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS quality_gate_passed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS quality_gate_metrics JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_email_drafts_reconciled ON email_drafts(reconciled_status);
CREATE INDEX IF NOT EXISTS idx_email_drafts_gmail_confirmed ON email_drafts(gmail_confirmed);

-- 3. Enhance Alternative Channels for Verified Match Badge and Cross-Channel Spacing
ALTER TABLE alternative_channels ADD COLUMN IF NOT EXISTS is_verified_match BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE alternative_channels ADD COLUMN IF NOT EXISTS evidence_sources JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE alternative_channels ADD COLUMN IF NOT EXISTS char_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alternative_channels ADD COLUMN IF NOT EXISTS suggested_touch_order INTEGER NOT NULL DEFAULT 1;
ALTER TABLE alternative_channels ADD COLUMN IF NOT EXISTS next_touch_eligible_at TIMESTAMPTZ;
ALTER TABLE alternative_channels ADD COLUMN IF NOT EXISTS is_locked_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_alternative_channels_verified ON alternative_channels(is_verified_match);
CREATE INDEX IF NOT EXISTS idx_alternative_channels_touch ON alternative_channels(next_touch_eligible_at);

-- 4. Productized Offers Table (Module 1)
CREATE TABLE IF NOT EXISTS productized_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    target_pipeline VARCHAR(50) NOT NULL CHECK (target_pipeline IN ('website_opportunities', 'ai_software_opportunities', 'both')),
    scope TEXT NOT NULL,
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    timeline VARCHAR(100) NOT NULL,
    starting_price_range VARCHAR(100) NOT NULL DEFAULT 'Configured in Dashboard',
    excluded_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Buying Triggers Table (Module 2)
CREATE TABLE IF NOT EXISTS buying_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    trigger_type VARCHAR(100) NOT NULL CHECK (trigger_type IN ('new_registration', 'hiring_signal', 'review_friction', 'website_decay', 'funding_expansion')),
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    source_url TEXT,
    source_name VARCHAR(150) NOT NULL,
    observed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.90,
    weight_score NUMERIC(5, 2) NOT NULL DEFAULT 15.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buying_triggers_biz ON buying_triggers(business_id);
CREATE INDEX IF NOT EXISTS idx_buying_triggers_type ON buying_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_buying_triggers_date ON buying_triggers(observed_date DESC);

-- 6. Proof Items & Portfolio Engine (Module 4)
CREATE TABLE IF NOT EXISTS proof_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    client_industry VARCHAR(150) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    metric_result VARCHAR(255),
    testimonial_quote TEXT,
    case_study_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proof_approved ON proof_items(is_approved);
CREATE INDEX IF NOT EXISTS idx_proof_industry ON proof_items(client_industry);

-- 7. Domain Health Checks (Part C Deliverability Guard)
CREATE TABLE IF NOT EXISTS domain_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL,
    spf_status VARCHAR(50) NOT NULL CHECK (spf_status IN ('pass', 'missing', 'invalid')),
    dkim_status VARCHAR(50) NOT NULL CHECK (dkim_status IN ('pass', 'missing', 'invalid')),
    dmarc_status VARCHAR(50) NOT NULL CHECK (dmarc_status IN ('pass', 'missing', 'invalid')),
    dmarc_policy VARCHAR(50) NOT NULL DEFAULT 'none',
    mx_status VARCHAR(50) NOT NULL CHECK (mx_status IN ('pass', 'missing', 'invalid')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_health ON domain_health_checks(domain, checked_at DESC);

-- 8. Seed Placement Tests Table (Part C Deliverability Testing)
CREATE TABLE IF NOT EXISTS inbox_placement_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_subject VARCHAR(255) NOT NULL,
    template_name VARCHAR(150) NOT NULL,
    test_results JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ provider: 'Gmail', placement: 'Primary', timestamp: '...' }, { provider: 'Outlook', placement: 'Primary' }]
    primary_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
    spam_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    overall_result VARCHAR(50) NOT NULL CHECK (overall_result IN ('pass', 'warning', 'fail')),
    tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Row Level Security Policies for New Tables
ALTER TABLE productized_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buying_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_placement_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on offers" ON productized_offers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage on offers" ON productized_offers FOR ALL USING (true);

CREATE POLICY "Allow authenticated read on triggers" ON buying_triggers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage on triggers" ON buying_triggers FOR ALL USING (true);

CREATE POLICY "Allow public read on approved proof items" ON proof_items FOR SELECT USING (is_approved = true);
CREATE POLICY "Allow authenticated manage on proof items" ON proof_items FOR ALL USING (true);

CREATE POLICY "Allow authenticated read on domain health" ON domain_health_checks FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage on domain health" ON domain_health_checks FOR ALL USING (true);

CREATE POLICY "Allow authenticated read on placement tests" ON inbox_placement_tests FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage on placement tests" ON inbox_placement_tests FOR ALL USING (true);
-- =============================================================================
-- Growth System Agent â€” Migration 04: Intent-Based Lead Radar ("Hot Opportunities")
-- =============================================================================

CREATE TABLE IF NOT EXISTS intent_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source_platform VARCHAR(50) NOT NULL CHECK (source_platform IN (
        'hacker_news', 'reddit', 'remote_ok', 'remotive', 'github', 
        'upwork_manual', 'linkedin_manual', 'x_twitter', 'tender', 'other_manual'
    )),
    source_url TEXT NOT NULL,
    source_identifier VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    raw_content TEXT NOT NULL,
    sanitized_summary TEXT NOT NULL,
    poster_identity VARCHAR(255),
    poster_contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    intent_type VARCHAR(50) NOT NULL CHECK (intent_type IN (
        'explicit_hire_request', 'job_posting', 'recommendation_request', 
        'tender', 'pain_point_complaint', 'partnership_request', 'not_relevant'
    )),
    needed_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    stated_budget VARCHAR(100),
    urgency VARCHAR(50),
    location_or_tz VARCHAR(150),
    contract_type VARCHAR(100),
    fit_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
    fit_reasoning TEXT,
    legitimacy_score NUMERIC(5, 2) NOT NULL DEFAULT 100 CHECK (legitimacy_score >= 0 AND legitimacy_score <= 100),
    is_legitimate BOOLEAN NOT NULL DEFAULT TRUE,
    scam_warning_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    reply_route VARCHAR(50) NOT NULL CHECK (reply_route IN (
        'email', 'dm', 'public_comment', 'marketplace_proposal', 'apply_link', 'manual_reachout'
    )),
    tailored_pitch TEXT,
    pitch_word_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN (
        'new', 'pitched', 'replied', 'call_booked', 'won', 'lost', 'dismissed'
    )),
    posted_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contacted_at TIMESTAMPTZ,
    reminder_date TIMESTAMPTZ,
    respond_within_hours INTEGER DEFAULT 12,
    is_manual_import BOOLEAN NOT NULL DEFAULT FALSE,
    crm_deal_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_opps_fit ON intent_opportunities(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_intent_opps_posted_at ON intent_opportunities(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_opps_status ON intent_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_intent_opps_source ON intent_opportunities(source_platform);
CREATE INDEX IF NOT EXISTS idx_intent_opps_legit ON intent_opportunities(is_legitimate);

-- 2. Community Pitch Rules Table (Section 4)
CREATE TABLE IF NOT EXISTS community_pitch_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    community_name VARCHAR(100) NOT NULL, -- e.g. 'r/forhire', 'r/LocalLLaMA', 'hn_hiring'
    rule_notes TEXT NOT NULL,
    max_words INTEGER NOT NULL DEFAULT 80,
    allow_direct_links BOOLEAN NOT NULL DEFAULT FALSE,
    tone_guidance TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Community Rules
INSERT INTO community_pitch_rules (platform, community_name, rule_notes, max_words, allow_direct_links, tone_guidance)
VALUES 
('reddit', 'r/forhire', 'Must state [Hiring] or [For Hire] appropriately; strictly zero unsolicited PMs unless requested; no affiliate or spam links.', 80, false, 'Direct, humble, professional'),
('reddit', 'r/LocalLLaMA', 'High technical competence expected; reference specific models, quantizations, or architectures; zero boilerplate sales pitches.', 90, true, 'Engineering peer-to-peer, technical detail'),
('reddit', 'r/startups', 'Focus entirely on solving the founder problem; offer constructive advice first; soft invitation to exchange ideas.', 80, false, 'Founder-friendly, consultative'),
('hacker_news', 'ask_hn_hiring', 'Format: Name | Role | Location | Remote | Technologies | Contact. Keep it crisp, factual, no marketing fluff.', 75, true, 'Hacker News understated, purely technical'),
('marketplace', 'upwork_freelancer', 'Custom proposal addressing exact job requirements in first 2 sentences; state deliverables, timeline, 1 question.', 160, true, 'Professional, structured, action-oriented')
ON CONFLICT DO NOTHING;

-- 3. Row Level Security
ALTER TABLE intent_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_pitch_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read on intent opportunities" ON intent_opportunities FOR SELECT USING (true);
CREATE POLICY "Allow modify on intent opportunities" ON intent_opportunities FOR ALL USING (true);
CREATE POLICY "Allow read on community rules" ON community_pitch_rules FOR SELECT USING (true);

-- ============================================================================
-- GROWTH SYSTEM AGENT: Migration 05
-- Complete Multi-Tenant RLS Policies across all tables + OAuth Token Storage
-- ============================================================================

-- 1. OAuth Tokens Table for Secure In-App Gmail OAuth Integration
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'google',
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    iv VARCHAR(64) NOT NULL,
    auth_tag VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_email, provider)
);

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own oauth tokens" ON oauth_tokens
    FOR SELECT USING (user_email = auth.jwt()->>'email');

CREATE POLICY "Users can insert own oauth tokens" ON oauth_tokens
    FOR INSERT WITH CHECK (user_email = auth.jwt()->>'email');

CREATE POLICY "Users can update own oauth tokens" ON oauth_tokens
    FOR UPDATE USING (user_email = auth.jwt()->>'email');

CREATE POLICY "Users can delete own oauth tokens" ON oauth_tokens
    FOR DELETE USING (user_email = auth.jwt()->>'email');

-- 2. Explicit Multi-Tenant RLS Policies for Contacts
CREATE POLICY "Users can read org contacts" ON contacts
    FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can insert org contacts" ON contacts
    FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can update org contacts" ON contacts
    FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can delete org contacts" ON contacts
    FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

-- 3. Explicit Multi-Tenant RLS Policies for Growth Evidence
CREATE POLICY "Users can read org growth evidence" ON growth_evidence
    FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can insert org growth evidence" ON growth_evidence
    FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can update org growth evidence" ON growth_evidence
    FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can delete org growth evidence" ON growth_evidence
    FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

-- 4. Explicit Multi-Tenant RLS Policies for Website Checks
CREATE POLICY "Users can read org website checks" ON website_checks
    FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can insert org website checks" ON website_checks
    FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can update org website checks" ON website_checks
    FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

-- 5. Explicit Multi-Tenant RLS Policies for Lead Scores
CREATE POLICY "Users can read org lead scores" ON lead_scores
    FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can insert org lead scores" ON lead_scores
    FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can update org lead scores" ON lead_scores
    FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

-- 6. Explicit Multi-Tenant RLS Policies for Email Drafts
CREATE POLICY "Users can read org email drafts" ON email_drafts
    FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can insert org email drafts" ON email_drafts
    FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can update org email drafts" ON email_drafts
    FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can delete org email drafts" ON email_drafts
    FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids())));

-- 7. Explicit Multi-Tenant RLS Policies for Send Events
CREATE POLICY "Users can read org send events" ON send_events
    FOR SELECT USING (draft_id IN (SELECT id FROM email_drafts WHERE business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids()))));

CREATE POLICY "Users can insert org send events" ON send_events
    FOR INSERT WITH CHECK (draft_id IN (SELECT id FROM email_drafts WHERE business_id IN (SELECT id FROM businesses WHERE organization_id IN (SELECT get_user_org_ids()))));

-- 8. Explicit Multi-Tenant RLS Policies for Automation Jobs
CREATE POLICY "Users can read org automation jobs" ON automation_jobs
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert org automation jobs" ON automation_jobs
    FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update org automation jobs" ON automation_jobs
    FOR UPDATE USING (organization_id IN (SELECT get_user_org_ids()));

-- 9. Explicit Multi-Tenant RLS Policies for Audit Logs
CREATE POLICY "Users can read org audit logs" ON audit_logs
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert org audit logs" ON audit_logs
    FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- 10. Explicit Multi-Tenant RLS Policies for Discovery Runs
CREATE POLICY "Users can read org discovery runs" ON discovery_runs
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert org discovery runs" ON discovery_runs
    FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update org discovery runs" ON discovery_runs
    FOR UPDATE USING (organization_id IN (SELECT get_user_org_ids()));

-- 11. Explicit Multi-Tenant RLS Policies for Campaign Leads
CREATE POLICY "Users can read org campaign leads" ON campaign_leads
    FOR SELECT USING (campaign_id IN (SELECT id FROM campaigns WHERE organization_id IN (SELECT get_user_org_ids())));

CREATE POLICY "Users can insert org campaign leads" ON campaign_leads
    FOR INSERT WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE organization_id IN (SELECT get_user_org_ids())));

-- ============================================================================
-- GROWTH SYSTEM AGENT: Migration 06
-- Distributed Locks & Checkpoints for Serverless Cloud Resumption & Autonomy
-- ============================================================================

-- 1. Distributed Locks Table (Postgres lock preventing overlapping cloud runs)
CREATE TABLE IF NOT EXISTS distributed_locks (
    lock_name VARCHAR(100) PRIMARY KEY,
    locked_by VARCHAR(255) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_distributed_locks_expires ON distributed_locks(expires_at);

-- 2. Scheduler Checkpoints Table (Bounded batch resumption state)
CREATE TABLE IF NOT EXISTS scheduler_checkpoints (
    task_name VARCHAR(100) PRIMARY KEY,
    cursor_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_run_id VARCHAR(100),
    items_remaining INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'idle' CHECK (status IN ('idle', 'in_progress', 'paused', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_checkpoints_status ON scheduler_checkpoints(status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE distributed_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_checkpoints ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view locks and checkpoints
CREATE POLICY "Allow authenticated read locks" ON distributed_locks
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow authenticated manage locks" ON distributed_locks
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow authenticated read checkpoints" ON scheduler_checkpoints
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow authenticated manage checkpoints" ON scheduler_checkpoints
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
-- ==============================================================================
-- Growth System Agent â€” Platforms Engine, Applications Tracker & Lead Adapters
-- Migration: 20261031000000_platforms_engine_and_applications.sql
-- ==============================================================================

-- 1. Platforms Registry Table
CREATE TABLE IF NOT EXISTS public.platforms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    url TEXT NOT NULL,
    official_terms_url TEXT NOT NULL,
    how_to_get_clients TEXT NOT NULL,
    ai_ml_relevance TEXT NOT NULL,
    pitch_mode TEXT NOT NULL,
    integration_mode TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    cost_access_notes TEXT NOT NULL DEFAULT '',
    practical_note TEXT NOT NULL DEFAULT '',
    country_eligibility_status TEXT NOT NULL DEFAULT 'needs_check',
    my_account_status TEXT NOT NULL DEFAULT 'none',
    last_verified TIMESTAMPTZ NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platforms are viewable by all authenticated users" 
ON public.platforms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platforms can be modified by authenticated operators" 
ON public.platforms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Vetted Applications Tracker (Group B)
CREATE TABLE IF NOT EXISTS public.vetted_applications (
    id TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
    platform_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started',
    readiness_score INTEGER NOT NULL DEFAULT 0,
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    has_cv BOOLEAN NOT NULL DEFAULT false,
    has_github BOOLEAN NOT NULL DEFAULT false,
    case_studies_count INTEGER NOT NULL DEFAULT 0,
    has_demo_video BOOLEAN NOT NULL DEFAULT false,
    applied_date TIMESTAMPTZ NULL,
    next_action_date TIMESTAMPTZ NULL,
    interview_notes TEXT NULL,
    pakistan_check JSONB NOT NULL DEFAULT '{"onboarding_checked": false, "payout_method": "none", "withdrawal_fee_percent": 0, "tax_obligations_noted": false, "contractor_eligibility": "needs_check"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.vetted_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vetted applications are viewable by operator" 
ON public.vetted_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Lead Source Config & Credit Tracking (Group C)
CREATE TABLE IF NOT EXISTS public.lead_source_configs (
    id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL UNIQUE,
    monthly_credit_budget INTEGER NOT NULL DEFAULT 100,
    credits_used_this_month INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'not_configured',
    last_tested_at TIMESTAMPTZ NULL,
    api_key_configured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lead_source_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead sources viewable and editable by operator" 
ON public.lead_source_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Platform Footprint Table
CREATE TABLE IF NOT EXISTS public.platform_footprints (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    profile_url TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'website',
    verification_status TEXT NOT NULL DEFAULT 'possible_match',
    confidence NUMERIC NOT NULL DEFAULT 0.5,
    last_checked TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.platform_footprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Footprints viewable and editable by operator" 
ON public.platform_footprints FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Marketplace Hot Requests Table (Group A)
CREATE TABLE IF NOT EXISTS public.marketplace_hot_requests (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    post_url TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'explicit_hire',
    fit_score INTEGER NOT NULL DEFAULT 0,
    freshness_hours NUMERIC NOT NULL DEFAULT 0,
    is_scam BOOLEAN NOT NULL DEFAULT false,
    budget_range TEXT NULL,
    proposal_draft TEXT NOT NULL,
    screening_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    posted_at TIMESTAMPTZ NOT NULL,
    respond_before TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.marketplace_hot_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hot requests viewable and editable by operator" 
ON public.marketplace_hot_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Platform Spend Logs Table
CREATE TABLE IF NOT EXISTS public.platform_spend_logs (
    id TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL,
    platform_name TEXT NOT NULL,
    cost_type TEXT NOT NULL,
    amount_spent NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    notes TEXT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.platform_spend_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Spend logs viewable and editable by operator" 
ON public.platform_spend_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Seed Platforms Data
INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'upwork', 'Upwork', 'marketplace', 'https://www.upwork.com/', 'https://www.upwork.com/terms',
    'Browse client projects and send proposals; hourly/fixed contracts', 'AI/ML, LLM apps, Python, data science, computer vision, MLOps', 'proposal', 'manual_link',
    'High', 'Free account; proposal Connects and freelancer service fee may apply', 'Best starting point for active pitching; tailor every proposal.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'freelancer_com', 'Freelancer.com', 'marketplace', 'https://www.freelancer.com/', 'https://www.freelancer.com/terms',
    'Bid on posted projects and contests', 'ML models, Python, data analytics, AI integrations', 'proposal', 'manual_link',
    'High', 'Free tier limits; paid memberships/bids and project fees may apply', 'Check bid costs and client history before spending.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'peopleperhour', 'PeoplePerHour', 'marketplace', 'https://www.peopleperhour.com/', 'https://www.peopleperhour.com/terms',
    'Send proposals to projects; create fixed-price Offers', 'AI automation, Python, data science, web AI', 'proposal', 'manual_link',
    'High', 'Free proposal allowance/fees depend on plan and earnings', 'Useful additional marketplace; competition varies by category.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'guru', 'Guru', 'marketplace', 'https://www.guru.com/', 'https://www.guru.com/terms',
    'Search jobs and submit quotes; WorkRooms for contracts', 'Python, ML, analytics, software and AI services', 'proposal', 'manual_link',
    'High', 'Free membership limits; paid tiers and job fees may apply', 'Create a focused AI/ML service profile.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'contra', 'Contra', 'marketplace', 'https://contra.com/', 'https://contra.com/terms',
    'Discover opportunities, apply, showcase services and get discovered', 'AI products, software, data, automation', 'proposal', 'manual_link',
    'High', 'Freelancer commission model advertised as 0%; other fees/payment terms may apply', 'Strong portfolio-led option; opportunity volume can vary.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'workana', 'Workana', 'marketplace', 'https://www.workana.com/', 'https://www.workana.com/terms',
    'Apply/propose to client projects', 'Python, data, software, AI-related projects', 'proposal', 'manual_link',
    'Medium', 'Free and paid plans/commission terms vary', 'More Latin America-focused; check language and client geography.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'truelancer', 'Truelancer', 'marketplace', 'https://www.truelancer.com/', 'https://www.truelancer.com/terms',
    'Bid on projects and offer services', 'Python, data science, AI/ML, automation', 'proposal', 'manual_link',
    'Medium', 'Free bid limits; membership and service fees may apply', 'Supplementary channel, carefully vet project budgets.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'malt', 'Malt', 'marketplace', 'https://www.malt.com/', 'https://www.malt.com/terms',
    'Create consultant profile; clients discover/contact and projects are matched', 'Data science, AI consulting, software engineering', 'direct_message', 'manual_link',
    'High', 'Fees and availability depend on country/market', 'Strongest in Europe; verify onboarding eligibility from Pakistan.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'kolabtree', 'Kolabtree', 'marketplace', 'https://www.kolabtree.com/', 'https://www.kolabtree.com/terms',
    'Clients post scientific/technical projects; experts submit proposals', 'Machine learning, statistics, data science, research, bioinformatics', 'proposal', 'manual_link',
    'High', 'Platform fees/terms apply; check current expert terms', 'Especially relevant for research-grade ML and scientific data work.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'toptal', 'Toptal', 'vetted_network', 'https://www.toptal.com/', 'https://www.toptal.com/terms',
    'Apply and pass screening; platform matches experts with clients', 'AI/ML, data science, software engineering', 'matching_only', 'manual_link',
    'High', 'Selective screening; commercial terms vary', 'High-value potential but demanding vetting; not a quick-start channel.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'braintrust', 'Braintrust', 'vetted_network', 'https://www.usebraintrust.com/', 'https://www.usebraintrust.com/terms',
    'Join talent network and match with client opportunities', 'AI, data, software engineering', 'matching_only', 'manual_link',
    'High', 'Check current talent fee and country eligibility', 'Review current terms; platform model and availability can change.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'arc_dev', 'Arc.dev', 'vetted_network', 'https://arc.dev/', 'https://arc.dev/terms',
    'Apply to roles/projects; screening and matching', 'AI/ML engineering, Python, backend, full stack', 'application', 'manual_link',
    'High', 'Terms vary by engagement; screening required', 'For experienced engineers with demonstrable production work.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'lemon_io', 'Lemon.io', 'vetted_network', 'https://lemon.io/', 'https://lemon.io/terms',
    'Apply, complete vetting and get matched to projects', 'Python, backend, AI/ML where client demand exists', 'matching_only', 'manual_link',
    'High', 'Commercial terms vary; geographic/experience fit matters', 'Selective; confirm current country coverage.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'gun_io', 'Gun.io', 'vetted_network', 'https://gun.io/', 'https://gun.io/terms',
    'Apply and pass technical vetting; client matching', 'Senior software, data/AI engineering', 'matching_only', 'manual_link',
    'High', 'Terms vary; senior-level screening', 'Better for experienced engineers than beginners.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'a_team', 'A.Team', 'vetted_network', 'https://www.a.team/', 'https://www.a.team/terms',
    'Apply to network; join teams assembled for client projects', 'AI product development, data, engineering', 'matching_only', 'manual_link',
    'High', 'Terms and eligibility vary', 'Strong project-team model; selective network.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'andela', 'Andela', 'vetted_network', 'https://www.andela.com/', 'https://www.andela.com/terms',
    'Join talent network and match with enterprise opportunities', 'Software, data, cloud and AI engineering', 'proposal', 'manual_link',
    'High', 'Terms depend on engagement and region', 'Check whether independent talent intake is open in Pakistan.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'ai_ixx', 'AI IXX', 'marketplace', 'https://www.aiixx.ai/freelance', 'https://www.aiixx.ai/freelance/terms',
    'Browse AI opportunities / apply; clients can post AI projects', 'NLP, computer vision, ML, deep learning, speech AI', 'proposal', 'manual_link',
    'High', 'Check current membership, fees and project availability', 'AI-specific niche; verify platform activity and real project volume.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'meridial', 'Meridial', 'expert_network', 'https://www.meridial.ai/', 'https://www.meridial.ai/terms',
    'Create expert profile, browse and apply to AI project engagements', 'Coding, STEM, AI evaluation, model feedback and technical expertise', 'application', 'manual_link',
    'Medium', 'Rates and eligibility are project-specific; access does not guarantee work', 'More AI training/evaluation than building client ML products.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'catalant', 'Catalant', 'expert_network', 'https://catalant.com/', 'https://catalant.com/terms',
    'Apply/join expert network; get matched to consulting engagements', 'AI strategy, analytics, data transformation, technical consulting', 'matching_only', 'manual_link',
    'Medium', 'Eligibility and geography may be restrictive', 'Potentially useful for senior consultants; not a general open bid site.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'graphite', 'Graphite', 'expert_network', 'https://www.graphite.com/', 'https://www.graphite.com/terms',
    'Join network and get matched to business projects', 'Data science, analytics, AI and strategy', 'matching_only', 'manual_link',
    'Medium', 'Check current expert onboarding and geography', 'More consulting/analytics oriented; availability may be selective.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'flexiple', 'Flexiple', 'vetted_network', 'https://flexiple.com/', 'https://flexiple.com/terms',
    'Apply and get matched with companies', 'Software engineering, data and AI-related roles', 'matching_only', 'manual_link',
    'Medium', 'Terms and country coverage vary', 'Check if AI/ML roles and Pakistan onboarding are currently supported.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'index_dev', 'Index.dev', 'vetted_network', 'https://www.index.dev/', 'https://www.index.dev/terms',
    'Apply to network and receive project/client matching', 'Software, data engineering, AI/ML', 'matching_only', 'manual_link',
    'High', 'Terms vary by contract and location', 'For experienced engineers; not an open proposal marketplace.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'revelo', 'Revelo', 'vetted_network', 'https://www.revelo.com/', 'https://www.revelo.com/terms',
    'Join talent pool and match with companies', 'Software/data/AI engineering', 'matching_only', 'manual_link',
    'Medium', 'Primarily Americas/nearshore focus; check location eligibility', 'Not a direct open marketplace; likely geography constraints.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'apollo_io', 'Apollo.io', 'lead_database', 'https://www.apollo.io/', 'https://www.apollo.io/terms',
    'Find target companies and decision-makers; export/contact leads and run outreach', 'Find CTOs, founders, Heads of Data/AI at firms likely to need ML work', 'email', 'official_api',
    'High', 'Free tier/credits; paid plans for scale; follow email laws and platform terms', 'One of the strongest direct-outreach tools; verify emails and personalize.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'clay', 'Clay', 'lead_database', 'https://www.clay.com/', 'https://www.clay.com/terms',
    'Build targeted company/person lists, enrich data and personalize outreach workflows', 'Identify funded startups, AI product companies and firms hiring data/ML teams', 'proposal', 'csv_import',
    'High', 'Limited free usage; paid credits/plans for scale', 'Powerful but advanced; pair with a legitimate email sending tool.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'crunchbase', 'Crunchbase', 'company_intel', 'https://www.crunchbase.com/', 'https://www.crunchbase.com/terms',
    'Find funded/growing startups, recent funding and company signals; then contact via official channels', 'Target companies investing in AI, hiring ML teams or launching data products', 'research_only', 'official_api',
    'High', 'Free/paid access limits vary', 'Use as a prospect research source, not a freelance marketplace.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'clutch', 'Clutch', 'b2b_directory', 'https://clutch.co/', 'https://clutch.co/terms',
    'Find companies by industry/service, identify businesses and contact via listed website/contact routes', 'Find agencies, SaaS firms and businesses that may outsource AI/ML work', 'research_only', 'csv_import',
    'High', 'Browsing available; paid visibility options exist', 'Useful for agency partnerships/subcontracting and service-buyer research.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'goodfirms', 'GoodFirms', 'b2b_directory', 'https://www.goodfirms.co/', 'https://www.goodfirms.co/terms',
    'Research software companies/agencies and approach potential partners or buyers', 'AI/ML development demand, outsourcing partners, agencies', 'research_only', 'csv_import',
    'Medium', 'Free browsing; paid listing options', 'Better for finding agencies/partners than guaranteed project leads.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'g2', 'G2', 'company_intel', 'https://www.g2.com/', 'https://www.g2.com/terms',
    'Find software vendors and product companies; research target accounts', 'SaaS firms that may need AI features, integrations or ML consulting', 'research_only', 'csv_import',
    'Medium', 'Public research plus paid buyer-intent products', 'Use to identify relevant SaaS companies; not a pitch marketplace.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'builtwith', 'BuiltWith', 'company_intel', 'https://builtwith.com/', 'https://builtwith.com/terms',
    'Find websites/companies by technologies used; research fit and contact them', 'Companies using Python, cloud, analytics or AI-adjacent stacks', 'research_only', 'csv_import',
    'Medium', 'Free lookups limited; paid plans for deeper data', 'Technology signals are clues, not proof they need services.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'wappalyzer', 'Wappalyzer', 'company_intel', 'https://www.wappalyzer.com/', 'https://www.wappalyzer.com/terms',
    'Identify company tech stacks and build prospect lists', 'Businesses with data-heavy products, cloud stacks or outdated AI capabilities', 'research_only', 'csv_import',
    'Medium', 'Free limited use; paid lead features', 'Use technology data carefully; personalize based on actual business needs.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'hunter_io', 'Hunter.io', 'contact_finder', 'https://hunter.io/', 'https://hunter.io/terms',
    'Find and verify professional email addresses for target domains', 'Reach founders, CTOs and department leads after selecting companies', 'email', 'official_api',
    'High', 'Free monthly limits; paid credits/plans', 'Only contact relevant business addresses; comply with anti-spam rules.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'snov_io', 'Snov.io', 'contact_finder', 'https://snov.io/', 'https://snov.io/terms',
    'Find leads, verify emails and manage sequences', 'Build founder/CTO prospect lists for AI/ML services', 'email', 'official_api',
    'High', 'Free trial/limited credits; paid plans', 'Keep outreach relevant and low-volume; honor opt-outs.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'lusha', 'Lusha', 'lead_database', 'https://www.lusha.com/', 'https://www.lusha.com/terms',
    'Find professional contacts and company data', 'Decision-makers at SaaS, fintech, healthtech and enterprise firms', 'direct_message', 'csv_import',
    'Medium', 'Limited free credits; paid plans', 'Check data coverage and lawful use in target markets.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'rocketreach', 'RocketReach', 'contact_finder', 'https://rocketreach.co/', 'https://rocketreach.co/terms',
    'Search professional profiles and contact details', 'Find founders, CTOs, data/AI leaders', 'direct_message', 'csv_import',
    'Medium', 'Limited free lookups; paid plans', 'Verify contact accuracy before outreach.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'leadiq', 'LeadIQ', 'lead_database', 'https://leadiq.com/', 'https://leadiq.com/terms',
    'Capture contacts and build prospect lists from company research', 'Target CTOs, VP Engineering, AI/ML leaders', 'proposal', 'csv_import',
    'Medium', 'Free/paid tiers; limits vary', 'Sales-oriented; may be more than a solo freelancer needs initially.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'seamless_ai', 'Seamless.AI', 'lead_database', 'https://seamless.ai/', 'https://seamless.ai/terms',
    'Discover company contacts and build lead lists', 'Find decision-makers at target companies', 'direct_message', 'csv_import',
    'Medium', 'Plan/credit restrictions; verify data', 'Assess pricing and data quality before subscribing.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'linkedin_sales_navigator', 'LinkedIn Sales Navigator', 'lead_database', 'https://business.linkedin.com/sales-solutions/sales-navigator', 'https://business.linkedin.com/sales-solutions/sales-navigator/terms',
    'Advanced company/person search and lead lists; contact via allowed channels', 'Find founders, CTOs and AI leaders by industry, size and hiring signals', 'connection_note', 'csv_import',
    'High', 'Paid subscription; trial/availability varies', 'Professional prospecting product, not ordinary social posting; avoid automated spam.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'uplead', 'UpLead', 'lead_database', 'https://www.uplead.com/', 'https://www.uplead.com/terms',
    'Search verified B2B contacts and company filters', 'Find target buyers by role, industry and company size', 'direct_message', 'csv_import',
    'Medium', 'Paid plans/trial terms vary', 'Check country coverage and verification policy.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'kaspr', 'Kaspr', 'contact_finder', 'https://www.kaspr.io/', 'https://www.kaspr.io/terms',
    'Find business contact data from professional profiles', 'Find CTO/founder contacts for targeted outreach', 'direct_message', 'csv_import',
    'Medium', 'Free/paid credits; regional coverage varies', 'Check permitted data use and platform terms.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'findymail', 'Findymail', 'contact_finder', 'https://www.findymail.com/', 'https://www.findymail.com/terms',
    'Find and verify B2B emails', 'Reach selected founders/technical buyers', 'proposal', 'csv_import',
    'Medium', 'Paid credits/plans; check current limits', 'A supporting tool, not a source of projects by itself.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'instantly', 'Instantly', 'email_sending_tool', 'https://instantly.ai/', 'https://instantly.ai/terms',
    'Run personalized email campaigns to a sourced prospect list', 'Reach qualified AI/ML buyers after research and verification', 'email', 'none',
    'Medium', 'Paid plans; domain/inbox setup and deliverability work needed', 'Not a lead marketplace; use responsibly, avoid bulk spam.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'smartlead', 'Smartlead', 'email_sending_tool', 'https://smartlead.ai/', 'https://smartlead.ai/terms',
    'Manage personalized multi-inbox email campaigns', 'Reach target companies with tailored ML use cases', 'email', 'none',
    'Medium', 'Paid plans; setup required', 'Not a source of leads; pair with a verified prospect database.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'lemlist', 'Lemlist', 'email_sending_tool', 'https://www.lemlist.com/', 'https://www.lemlist.com/terms',
    'Personalized email and multichannel sales sequences', 'Pitch AI consulting and ML engineering to qualified businesses', 'email', 'none',
    'Medium', 'Paid plans; usage terms apply', 'Use only after defining a clear target customer and offer.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from AI/ML Client Acquisition Platforms directory.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'fiverr', 'Fiverr', 'marketplace', 'https://www.fiverr.com/', 'https://www.fiverr.com/terms',
    'Create gigs and apply to Buyer Requests / Fiverr Pro client briefs', 'AI development, Python scripts, ML data models, chatbots', 'proposal', 'manual_link',
    'Medium', 'Free account; commission on completed orders', 'Apply for Fiverr Pro / AI Services catalog for higher ticket projects.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'codementor', 'Codementor', 'marketplace', 'https://www.codementor.io/', 'https://www.codementor.io/terms',
    'Live 1:1 mentorship, code review, and freelance project contracts', 'Python, PyTorch, TensorFlow, LLM debugging, RAG architecture', 'proposal', 'manual_link',
    'High', 'Vetting process; platform fee on earnings', 'Excellent for fast paid consults and turning mentorship into long-term contracts.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'freelancermap', 'Freelancermap', 'marketplace', 'https://www.freelancermap.com/', 'https://www.freelancermap.com/terms',
    'Search European & global IT/engineering contract postings', 'Python, Data Engineering, Machine Learning, Cloud AI', 'proposal', 'manual_link',
    'Medium', 'Basic free tier; premium subscription for unlimited applications', 'Strong DACH/European enterprise presence; check language requirements.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'hubstaff_talent', 'Hubstaff Talent', 'marketplace', 'https://talent.hubstaff.com/', 'https://talent.hubstaff.com/terms',
    'Free marketplace connecting remote contractors with startups', 'Remote Python / ML development, automation, backend AI', 'proposal', 'manual_link',
    'Medium', '100% free for contractors and clients', 'No platform fees; direct client communication.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'codeable', 'Codeable', 'marketplace', 'https://codeable.io/', 'https://codeable.io/terms',
    'Vetted WordPress & WooCommerce freelance network', 'WordPress AI search integrations, recommendation engines, custom plugins', 'matching_only', 'manual_link',
    'Medium', 'Strict vetting (tests, live coding); minimum -120/hr rate', 'Niche marketplace; high rates for technical specialists.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'wellfound', 'Wellfound', 'job_feed', 'https://wellfound.com/', 'https://wellfound.com/terms',
    'Startup job board with contract, fractional and early-stage roles', 'Foundational AI/ML engineer roles, GenAI prototypes, LLM pipelines', 'application', 'manual_link',
    'High', 'Free candidate profile', 'Direct contact with startup founders and technical co-founders.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'work_at_a_startup', 'Work at a Startup', 'job_feed', 'https://www.workatastartup.com/', 'https://www.workatastartup.com/terms',
    'Official Y Combinator portfolio hiring platform', 'YC AI batch companies hiring AI engineers, RAG builders, and data leads', 'application', 'manual_link',
    'High', 'Free profile creation for candidates', 'Direct founder access; focus on demonstrated working prototypes.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'turing', 'Turing', 'vetted_network', 'https://www.turing.com/', 'https://www.turing.com/terms',
    'AI-vetted talent cloud matching engineers with US tech companies', 'Machine learning, LLM fine-tuning, Python, data pipelines', 'matching_only', 'manual_link',
    'High', 'Free automated coding tests and vetting exams', 'Rigorous technical vetting; matches often long-term full-time remote.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'x_team', 'X-Team', 'vetted_network', 'https://x-team.com/', 'https://x-team.com/terms',
    'Curated engineering teams for global brands (Riot, Fox, Coinbase)', 'Senior engineering, cloud ML, scalable data systems', 'matching_only', 'manual_link',
    'High', 'Screening process, culture interview, code assessment', 'High-retention culture; stable long-term client allocations.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'deazy', 'Deazy', 'vetted_network', 'https://www.deazy.com/', 'https://www.deazy.com/terms',
    'Platform matching vetted development teams and specialists with UK enterprises', 'AI integration, cloud engineering, enterprise data platforms', 'matching_only', 'manual_link',
    'Medium', 'Vetting assessment; agency/contractor partnership agreement', 'UK commercial contracts; enterprise clients.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'comatch', 'Comatch', 'vetted_network', 'https://www.comatch.com/', 'https://www.comatch.com/terms',
    'Business consulting marketplace (Malt group) for specialist advisors', 'AI strategy, data analytics consulting, digital transformation', 'matching_only', 'manual_link',
    'Medium', 'Consultant profile review and interview', 'Enterprise advisory and strategy consulting engagements.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'expert360', 'Expert360', 'vetted_network', 'https://expert360.com/', 'https://expert360.com/terms',
    'Australasia and global network for elite tech and management consultants', 'Data science, predictive analytics, enterprise automation', 'matching_only', 'manual_link',
    'Medium', 'Profile screening and interview', 'Strong APAC market access (Australia / New Zealand enterprise).',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'sortlist', 'Sortlist', 'vetted_network', 'https://www.sortlist.com/', 'https://www.sortlist.com/terms',
    'B2B matchmaking service connecting businesses with agencies and specialists', 'AI development agencies, machine learning consultants', 'matching_only', 'manual_link',
    'Medium', 'Subscription and credit model for pitch invitations', 'Requires agency/consultancy positioning.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'glg_gerson_lehrman_group', 'GLG (Gerson Lehrman Group)', 'expert_network', 'https://glginsights.com/', 'https://glginsights.com/terms',
    'High-rate consultation calls (1 hour) with investors, funds, and corporate executives', 'AI market landscape, model selection, enterprise adoption friction', 'matching_only', 'manual_link',
    'High', 'Application by invitation or referral; typical rate -500+/hr', 'Strict compliance rules; zero confidential data disclosure allowed.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'alphasights', 'AlphaSights', 'expert_network', 'https://www.alphasights.com/', 'https://www.alphasights.com/terms',
    'Knowledge search firm connecting decision makers with technical experts', 'AI infrastructure, GPU computing, LLM deployment realities', 'matching_only', 'manual_link',
    'Medium', 'Free profile; compensated hourly for phone consultations', 'Fast-turnaround requests; high hourly payout.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'guidepoint', 'Guidepoint', 'expert_network', 'https://www.guidepoint.com/', 'https://www.guidepoint.com/terms',
    'Global expert network providing teleconference consultations and surveys', 'Computer vision deployment, healthcare ML, fintech risk models', 'matching_only', 'manual_link',
    'Medium', 'Free application; set your own hourly rate', 'Great secondary income stream and industry pulse check.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'mercor', 'Mercor', 'vetted_network', 'https://www.mercor.com/', 'https://www.mercor.com/terms',
    'AI-driven hiring platform for top software and AI researchers', 'Foundation model evaluation, code generation benchmarking, LLM RLHF', 'application', 'manual_link',
    'High', 'AI video interview and GitHub assessment', 'Rapid hiring cycles; competitive Silicon Valley compensation.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'micro1', 'micro1', 'vetted_network', 'https://www.micro1.ai/', 'https://www.micro1.ai/terms',
    'AI recruiter vetting developers for global tech companies', 'Full-stack AI developers, Python/FastAPI engineers, ML researchers', 'application', 'manual_link',
    'High', 'AI screening interview (GPT-powered tech check)', 'Fast screening process with clear hourly billing.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'outlier', 'Outlier', 'vetted_network', 'https://outlier.ai/', 'https://outlier.ai/terms',
    'Advanced AI training, RLHF, and frontier model reasoning evaluation', 'Python coding evaluation, math/logic validation, model red-teaming', 'application', 'manual_link',
    'High', 'Application and assessment quiz', 'Flexible hourly tasking directly training frontier LLMs.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'designrush', 'DesignRush', 'b2b_directory', 'https://www.designrush.com/', 'https://www.designrush.com/terms',
    'B2B marketplace finding software agencies and consulting firms', 'AI development agencies, web application development', 'research_only', 'csv_import',
    'Medium', 'Free agency listing; paid promotional tiers', 'Good research source for agency subcontracting partnerships.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'the_manifest', 'The Manifest', 'b2b_directory', 'https://themanifest.com/', 'https://themanifest.com/terms',
    'Clutch sister directory ranking tech service companies', 'AI development firms, data analytics providers', 'research_only', 'csv_import',
    'Medium', 'Tied to Clutch directory profile', 'Identify mid-market agencies needing overflow ML capacity.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'softwareworld', 'SoftwareWorld', 'b2b_directory', 'https://www.softwareworld.co/', 'https://www.softwareworld.co/terms',
    'Review platform for software products and tech service providers', 'Enterprise software, analytics tools, AI SaaS', 'research_only', 'csv_import',
    'Low', 'Free listing / research directory', 'Find software companies lacking modern AI features.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'capterra', 'Capterra', 'company_intel', 'https://www.capterra.com/', 'https://www.capterra.com/terms',
    'Gartner software review directory with thousands of niche SaaS products', 'Vertical SaaS apps in healthcare, logistics, legal, and finance', 'research_only', 'csv_import',
    'High', 'Public directory research', 'Prime source to find established B2B software companies ripe for RAG/AI add-ons.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'f6s', 'F6S', 'startup_community', 'https://www.f6s.com/', 'https://www.f6s.com/terms',
    'Global startup community with 4M+ startups, accelerators, and founders', 'Early-stage tech startups, AI startups, funded companies', 'research_only', 'csv_import',
    'Medium', 'Free founder directory search', 'Identify seed-stage startups that need MVP machine learning prototypes.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'product_hunt', 'Product Hunt', 'startup_community', 'https://www.producthunt.com/', 'https://www.producthunt.com/terms',
    'Daily showcase of new tech products and software launches', 'Newly launched SaaS, AI tools, developer platforms', 'research_only', 'csv_import',
    'High', 'Free public feed', 'Reach out immediately after launch with evidence-based feature improvements.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'betalist', 'BetaList', 'startup_community', 'https://betalist.com/', 'https://betalist.com/terms',
    'Early-access discovery platform for pre-launch startups', 'Pre-launch software products, early AI tools', 'research_only', 'csv_import',
    'Medium', 'Free public feed', 'Catch startups at their inception when they need external engineering support.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'indie_hackers', 'Indie Hackers', 'startup_community', 'https://www.indiehackers.com/', 'https://www.indiehackers.com/terms',
    'Bootstrapped software founder community sharing revenue and technical challenges', 'Micro-SaaS founders looking to add AI capabilities or reduce churn', 'comment_reply', 'manual_link',
    'High', 'Free community account', 'Add value in public discussions first before making soft private offers.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'y_combinator_directory', 'Y Combinator Directory', 'startup_community', 'https://www.ycombinator.com/companies', 'https://www.ycombinator.com/companies/terms',
    'Directory of 4,000+ YC funded companies with batch, founder, and domain data', 'Funded startups building intensive AI, fintech, and data infrastructure', 'research_only', 'csv_import',
    'High', 'Public database', 'Look for recently funded companies with technical hiring signals.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'techstars_portfolio', 'Techstars Portfolio', 'startup_community', 'https://www.techstars.com/portfolio', 'https://www.techstars.com/portfolio/terms',
    'Searchable directory of 3,000+ accelerator-backed tech startups', 'B2B tech, healthtech, supply chain, automated commerce', 'research_only', 'csv_import',
    'Medium', 'Public database', 'Great target accounts for technical advisory and Proof-of-Concept builds.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'github_organizations', 'GitHub Organizations', 'company_intel', 'https://github.com/', 'https://github.com/terms',
    'Inspect public repositories, tech stacks, and active issues of target companies', 'Open-source tool adopters, LangChain/LlamaIndex users, Python projects', 'research_only', 'manual_link',
    'High', 'Free public exploration', 'Look for companies struggling with open issues or unoptimized model architectures.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'hugging_face_organizations', 'Hugging Face Organizations', 'company_intel', 'https://huggingface.co/', 'https://huggingface.co/terms',
    'Hub for enterprise AI models, datasets, spaces, and community papers', 'Enterprises fine-tuning open-weight models (Llama, Mistral, Whisper)', 'research_only', 'manual_link',
    'High', 'Free exploration', 'Find companies actively deploying open models who need production inference optimization.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'hacker_news_hiring', 'Hacker News Hiring', 'job_feed', 'https://news.ycombinator.com/', 'https://news.ycombinator.com/terms',
    'Monthly Who is hiring? and Seeking freelancer? threads on HN', 'Technical founders hiring Python, ML, and AI systems contractors', 'comment_reply', 'rss_or_feed',
    'High', 'Free public forum', 'Algolia API adapter integrated for real-time instant alerts.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'reddit_r_forhire', 'Reddit r/forhire', 'job_feed', 'https://www.reddit.com/r/forhire/', 'https://www.reddit.com/r/forhire/terms',
    'Direct client hiring posts tagged [Hiring] for developer and data work', 'AI app development, data scraping, model training, automation', 'direct_message', 'rss_or_feed',
    'High', 'Free public feed', 'Reddit JSON adapter integrated for real-time 0-48h hot alerts.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'linkedin_groups', 'LinkedIn Groups', 'social', 'https://www.linkedin.com/groups/', 'https://www.linkedin.com/groups/terms',
    'Niche industry discussion groups (AI in Healthcare, Legal Tech, FinTech)', 'B2B discussions on practical enterprise AI adoption', 'comment_reply', 'manual_link',
    'Medium', 'Free with LinkedIn profile', 'Manual value-first engagement; never post spammy self-promotions.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'mlops_community', 'MLOps Community', 'startup_community', 'https://mlops.community/', 'https://mlops.community/terms',
    'Global Slack and Discord community of 20,000+ ML practitioners and tech leads', 'Production ML, monitoring, pipeline orchestration, model serving', 'direct_message', 'manual_link',
    'High', 'Free community registration', 'Look for #jobs and #help channels where teams discuss deployment bottlenecks.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'google_business_profile', 'Google Business Profile', 'local_business_directory', 'https://business.google.com/', 'https://business.google.com/terms',
    'Local commercial businesses without websites or with broken digital presence', 'Modern mobile-first website design, local SEO, AI automated booking', 'contact_form', 'official_api',
    'High', 'Google Places API (New)', '10-day business website offer with verified customer phone numbers.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'yelp', 'Yelp', 'local_business_directory', 'https://www.yelp.com/', 'https://www.yelp.com/terms',
    'Local business directory with customer reviews and claimed listing statuses', 'Local businesses with negative reviews due to slow response times or broken websites', 'research_only', 'manual_link',
    'Medium', 'Public directory research', 'Target businesses with high review volume but unfunctional websites.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'trustpilot', 'Trustpilot', 'local_business_directory', 'https://www.trustpilot.com/', 'https://www.trustpilot.com/terms',
    'Customer review portal revealing customer service friction in e-commerce and SaaS', 'Automated support bots, sentiment analysis, customer ticket routing', 'research_only', 'manual_link',
    'Medium', 'Public review research', 'Review friction is one of the highest converting triggers for AI support offers.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'facebook_pages', 'Facebook Pages', 'social', 'https://www.facebook.com/', 'https://www.facebook.com/terms',
    'Active local commercial businesses operating exclusively through social pages', 'Standalone high-converting websites, WhatsApp ordering integrations', 'direct_message', 'manual_link',
    'Medium', 'Manual direct message / link', '30-60 word concise pitch pointing out revenue lost without an independent site.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'instagram', 'Instagram', 'social', 'https://www.instagram.com/', 'https://www.instagram.com/terms',
    'Visual and commercial brands needing automated catalog and DM ordering', 'E-commerce demand forecasting, automated DM lead capture', 'direct_message', 'manual_link',
    'Medium', 'Manual direct message', 'Short 30-50 word DM referencing their recent post or bio link.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'whatsapp_business', 'WhatsApp Business', 'social', 'https://www.whatsapp.com/business/', 'https://www.whatsapp.com/business/terms',
    'Direct 1-click reachout for verified commercial businesses listing their phone', 'AI customer assistants, catalog bots, direct quote automation', 'direct_message', 'manual_link',
    'High', 'wa.me deep link protocol', 'Strictly 2-3 short lines. Only message if the business publicly displays their WhatsApp.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'nextdoor', 'Nextdoor', 'local_business_directory', 'https://nextdoor.com/', 'https://nextdoor.com/terms',
    'Hyperlocal neighborhood recommendations and home services', 'Contractors, roofers, plumbers, and home service providers', 'research_only', 'manual_link',
    'Low', 'Public neighborhood directory', 'View-only research to identify high-demand local service companies.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'uk_contracts_finder', 'UK Contracts Finder', 'tender_portal', 'https://www.contractsfinder.service.gov.uk/', 'https://www.contractsfinder.service.gov.uk/terms',
    'Official UK government portal for public sector procurement over 12,000', 'Public data analytics, automated document classification, AI digital services', 'proposal', 'manual_link',
    'Medium', 'Free registration for bidding', 'Formal tender process; requires strict compliance and insurance.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'sam_gov', 'SAM.gov', 'tender_portal', 'https://sam.gov/', 'https://sam.gov/terms',
    'US Federal contract opportunities and small business set-asides', 'Defense, research, healthcare data engineering and computer vision contracts', 'proposal', 'manual_link',
    'Medium', 'Free SAM registration (requires UEI and CAGE code)', 'Complex onboarding; high budget ceiling.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;

INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    'ted_tenders_electronic_daily', 'TED (Tenders Electronic Daily)', 'tender_portal', 'https://ted.europa.eu/', 'https://ted.europa.eu/terms',
    'European public procurement notices across EU member states', 'Smart city analytics, environmental AI modeling, document processing', 'proposal', 'manual_link',
    'Medium', 'Free access and alerts', 'High-value European research and software implementation tenders.',
    'needs_check', 'none', NULL, true,
    'Verify current terms before use. Sourced from Section 12 expansion registry.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    official_terms_url = EXCLUDED.official_terms_url,
    how_to_get_clients = EXCLUDED.how_to_get_clients,
    ai_ml_relevance = EXCLUDED.ai_ml_relevance,
    pitch_mode = EXCLUDED.pitch_mode,
    integration_mode = EXCLUDED.integration_mode,
    priority = EXCLUDED.priority,
    cost_access_notes = EXCLUDED.cost_access_notes,
    practical_note = EXCLUDED.practical_note;
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

