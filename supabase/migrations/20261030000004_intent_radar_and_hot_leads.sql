-- =============================================================================
-- Growth System Agent — Migration 04: Intent-Based Lead Radar ("Hot Opportunities")
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
