-- =============================================================================
-- Growth System Agent — Migration 03: Real-Time Discovery, Deliverability & Multi-Platform Outreach
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
