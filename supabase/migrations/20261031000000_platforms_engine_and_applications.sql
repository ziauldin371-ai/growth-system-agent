-- ==============================================================================
-- Growth System Agent — Platforms Engine, Applications Tracker & Lead Adapters
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
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
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
