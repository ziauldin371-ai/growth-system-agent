-- =============================================================================
-- Growth System Agent — Migration: Alternative Channels & Scheduler Runs
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

