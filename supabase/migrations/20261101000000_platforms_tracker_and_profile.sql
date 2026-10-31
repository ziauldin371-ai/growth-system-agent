-- ==============================================================================
-- Growth System Agent — Platforms Tracker, Daily Targets & Operator Profile
-- Migration: 20261101000000_platforms_tracker_and_profile.sql
-- ==============================================================================

-- 1. Platform Tracker Table
CREATE TABLE IF NOT EXISTS public.platform_tracker (
    id TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started',
    my_profile_url TEXT NULL,
    notes TEXT NULL,
    last_action_date TIMESTAMPTZ NULL,
    follow_up_date TIMESTAMPTZ NULL,
    checklist JSONB NOT NULL DEFAULT '{"headline": false, "bio": false, "portfolio": false, "rates": false, "skills": false, "verification": false, "payout": false}'::jsonb,
    custom_pitch TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.platform_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform tracker viewable and editable by operator"
ON public.platform_tracker FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.platform_tracker TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_tracker TO authenticated;
REVOKE ALL ON TABLE public.platform_tracker FROM anon;

-- 2. Daily Proposal Targets Table
CREATE TABLE IF NOT EXISTS public.platform_daily_targets (
    id TEXT PRIMARY KEY,
    target_date DATE NOT NULL UNIQUE,
    target_count INTEGER NOT NULL DEFAULT 5,
    completed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.platform_daily_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily targets viewable and editable by operator"
ON public.platform_daily_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.platform_daily_targets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_daily_targets TO authenticated;
REVOKE ALL ON TABLE public.platform_daily_targets FROM anon;

-- 3. Operator Profile Table (Services, rates, portfolio links for pitches)
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

-- Insert default operator profile row if not present
INSERT INTO public.operator_profile (id, name, headline, services, portfolio_links, bio, years_of_experience, rate_range, availability, languages, timezone, demo_mode_enabled)
VALUES (
    'default',
    'Zia Ul Din',
    'Solo AI, Automation & Web Developer',
    'AI automation (n8n, Make, Zapier workflows), LLM / RAG / chatbot integrations, ML / data projects, websites and web apps for small businesses',
    '["", "", ""]'::jsonb,
    'Experienced engineer specializing in end-to-end workflow automation, conversational AI systems, and responsive web applications for growing businesses.',
    '4+ years',
    '$35 - $65 / hr',
    '20-30 hrs/week',
    'English, Urdu',
    'PKT (UTC+5)',
    false
) ON CONFLICT (id) DO NOTHING;
