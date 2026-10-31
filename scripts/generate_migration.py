import json
import re

with open('src/data/seed-platforms.json', 'r', encoding='utf-8') as f:
    platforms = json.load(f)

sql_lines = []
sql_lines.append('-- ==============================================================================')
sql_lines.append('-- Growth System Agent — Platforms Engine, Applications Tracker & Lead Adapters')
sql_lines.append('-- Migration: 20261031000000_platforms_engine_and_applications.sql')
sql_lines.append('-- ==============================================================================\n')

# 1. Platforms Table
sql_lines.append('''-- 1. Platforms Registry Table
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
''')

# 2. Vetted Applications Tracker Table (Group B)
sql_lines.append('''-- 2. Vetted Applications Tracker (Group B)
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
''')

# 3. Lead Source Configurations (Group C)
sql_lines.append('''-- 3. Lead Source Config & Credit Tracking (Group C)
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
''')

# 4. Platform Footprints ("Where else can I reach them?")
sql_lines.append('''-- 4. Platform Footprint Table
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
''')

# 5. Marketplace Hot Requests (Group A)
sql_lines.append('''-- 5. Marketplace Hot Requests Table (Group A)
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
''')

# 6. Platform Spend Logs (Connects/Bids spend tracker)
sql_lines.append('''-- 6. Platform Spend Logs Table
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
''')

# 7. Seed Platforms
sql_lines.append('-- 7. Seed Platforms Data')
for p in platforms:
    def esc(s):
        if s is None:
            return "''"
        return "'" + str(s).replace("'", "''") + "'"
    
    sql_lines.append(f"""INSERT INTO public.platforms (
    id, name, category, url, official_terms_url, how_to_get_clients,
    ai_ml_relevance, pitch_mode, integration_mode, priority, cost_access_notes,
    practical_note, country_eligibility_status, my_account_status, last_verified, is_active, notes
) VALUES (
    {esc(p['id'])}, {esc(p['name'])}, {esc(p['category'])}, {esc(p['url'])}, {esc(p['officialTermsUrl'])},
    {esc(p['howToGetClients'])}, {esc(p['aiMlRelevance'])}, {esc(p['pitchMode'])}, {esc(p['integrationMode'])},
    {esc(p['priority'])}, {esc(p['costAccessNotes'])}, {esc(p['practicalNote'])},
    {esc(p['countryEligibilityStatus'])}, {esc(p['myAccountStatus'])}, NULL, {str(p['isActive']).lower()},
    {esc(p['notes'])}
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
""")

with open('supabase/migrations/20261031000000_platforms_engine_and_applications.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print('Generated migration: supabase/migrations/20261031000000_platforms_engine_and_applications.sql')
