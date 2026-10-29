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
