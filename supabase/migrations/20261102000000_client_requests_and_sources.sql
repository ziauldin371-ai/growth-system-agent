-- ==============================================================================
-- Growth System Agent — Client Requests Opportunity Radar & Lead Sources
-- Migration: 20261102000000_client_requests_and_sources.sql
-- ==============================================================================

-- 1. Safely drop unused old platform tracker tables IF EMPTY
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_tracker') THEN
        IF (SELECT count(*) FROM public.platform_tracker) = 0 THEN
            DROP TABLE public.platform_tracker;
        END IF;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_daily_targets') THEN
        IF (SELECT count(*) FROM public.platform_daily_targets) = 0 THEN
            DROP TABLE public.platform_daily_targets;
        END IF;
    END IF;
END $$;

-- 2. Operator Profile Table (Ensure exists for pitches and profile management)
CREATE TABLE IF NOT EXISTS public.operator_profile (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT NOT NULL DEFAULT 'Zia Ul Din',
    headline TEXT NOT NULL DEFAULT 'Solo AI, Automation & Web Developer',
    services TEXT NOT NULL DEFAULT 'AI automation (n8n, Make, Zapier workflows), LLM / RAG / chatbot integrations, ML / data projects, websites and web apps for small businesses',
    portfolio_links JSONB NOT NULL DEFAULT '["", "", ""]'::jsonb,
    bio TEXT NOT NULL DEFAULT '',
    years_of_experience TEXT NULL DEFAULT '',
    rate_range TEXT NOT NULL DEFAULT '$35 - $65 / hr',
    availability TEXT NOT NULL DEFAULT '20-30 hrs/week',
    languages TEXT NOT NULL DEFAULT 'English, Urdu',
    timezone TEXT NOT NULL DEFAULT 'PKT (UTC+5)',
    demo_mode_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.operator_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operator profile viewable and editable by operator"
ON public.operator_profile FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.operator_profile TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.operator_profile TO authenticated;
REVOKE ALL ON TABLE public.operator_profile FROM anon;

-- 3. Lead Sources Registry Table
CREATE TABLE IF NOT EXISTS public.lead_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    access_tier TEXT NOT NULL DEFAULT 'tier_b_manual', -- 'tier_a_auto', 'tier_b_manual', 'tier_c_link', 'expert_network_excluded'
    method TEXT NOT NULL DEFAULT 'manual_capture',    -- 'official_api', 'public_rss', 'manual_capture', 'link_only', 'excluded'
    terms_note TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_checked',       -- 'not_checked', 'verified_api', 'manual_only', 'blocked', 'failed'
    last_checked TIMESTAMPTZ NULL,
    last_success TIMESTAMPTZ NULL,
    notes TEXT NULL,
    pitch_style TEXT NOT NULL DEFAULT 'marketplace_application', -- 'marketplace_application', 'talent_network_summary', 'startup_hiring_note', 'community_reply', 'cold_email'
    channel_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lead sources viewable and editable by operator"
ON public.lead_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.lead_sources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lead_sources TO authenticated;
REVOKE ALL ON TABLE public.lead_sources FROM anon;

-- 4. Client Requests Table
CREATE TABLE IF NOT EXISTS public.client_requests (
    id TEXT PRIMARY KEY,
    source_platform TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_post_id TEXT NULL,
    post_url TEXT NOT NULL,
    quote TEXT NOT NULL,
    need_summary TEXT NOT NULL,
    match_score INTEGER NOT NULL DEFAULT 0,
    service_fit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'skipped', 'remind_later'
    found_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    person_name TEXT NULL,
    company_name TEXT NULL,
    platform_username TEXT NULL,
    platform_profile_url TEXT NULL,
    company_website TEXT NULL,
    company_profile_url TEXT NULL,
    budget TEXT NULL,
    urgency_signals TEXT NULL,
    capture_method TEXT NOT NULL DEFAULT 'auto_feed', -- 'auto_feed', 'paste', 'screenshot', 'bookmarklet', 'csv_import'
    company_id UUID NULL REFERENCES public.businesses(id) ON DELETE SET NULL,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_client_requests_found_at ON public.client_requests(found_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_requests_match_score ON public.client_requests(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_client_requests_status ON public.client_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_requests_source_url ON public.client_requests(source_url);

ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client requests viewable and editable by operator"
ON public.client_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.client_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_requests TO authenticated;
REVOKE ALL ON TABLE public.client_requests FROM anon;

-- 5. Request Channels Table
CREATE TABLE IF NOT EXISTS public.request_channels (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'email', 'platform_message', 'contact_form', 'phone', 'social'
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    public_source_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_request_channels_request ON public.request_channels(request_id);

ALTER TABLE public.request_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Request channels viewable and editable by operator"
ON public.request_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.request_channels TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.request_channels TO authenticated;
REVOKE ALL ON TABLE public.request_channels FROM anon;

-- 6. Request Pitches Table
CREATE TABLE IF NOT EXISTS public.request_pitches (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL, -- 'email', 'platform_message', 'follow_up'
    variant TEXT NOT NULL DEFAULT 'variant_a',
    subject TEXT NULL,
    text TEXT NOT NULL,
    edited_text TEXT NULL,
    read_aloud_passed BOOLEAN NOT NULL DEFAULT true,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_request_pitches_request ON public.request_pitches(request_id);

ALTER TABLE public.request_pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Request pitches viewable and editable by operator"
ON public.request_pitches FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.request_pitches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.request_pitches TO authenticated;
REVOKE ALL ON TABLE public.request_pitches FROM anon;

-- 7. Request Events Table (Audit / Action History)
CREATE TABLE IF NOT EXISTS public.request_events (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'created', 'viewed', 'copied', 'edited', 'contacted', 'skipped', 'reminded'
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_request_events_request ON public.request_events(request_id);

ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Request events viewable and editable by operator"
ON public.request_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.request_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.request_events TO authenticated;
REVOKE ALL ON TABLE public.request_events FROM anon;
