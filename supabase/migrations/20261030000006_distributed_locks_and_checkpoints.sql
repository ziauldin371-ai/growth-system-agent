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
