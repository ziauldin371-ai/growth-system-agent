# Growth System Agent — Operational Runbook & Cloud Automation Guide

> **Operator**: Zia Ul Din (`ziauldin371@gmail.com`)  
> **Role**: Full Stack AI Developer & Automation Architect  
> **Repository**: [github.com/ziauldin371-ai/growth-system-agent](https://github.com/ziauldin371-ai/growth-system-agent)  
> **Hosting & Architecture**: Vercel (Next.js Application), Supabase (PostgreSQL Persistence & RLS), GitHub Actions (Autonomous Cloud Scheduler)

---

## 1. Autonomous Cloud Schedule (Laptop & Antigravity Completely Off)

The platform is engineered to run twice daily 365 days a year without requiring your laptop or Antigravity to be on.

```
  ┌────────────────────────┐         ┌─────────────────────────┐         ┌────────────────────────┐
  │     GitHub Actions     │  POST   │       Vercel API        │  State  │  Supabase PostgreSQL   │
  │  09:00 & 17:00 PKT     ├────────►│ /api/cron/scheduled-run ├────────►│ • distributed_locks   │
  │ (.github/workflows)    │  Bearer │   (Bounded Batch Run)   │   RLS   │ • checkpoints          │
  └────────────────────────┘         └────────────┬────────────┘         │ • scheduler_history    │
                                                  │                      │ • leads & drafts       │
                                                  ▼                      └────────────────────────┘
                                      ┌──────────────────────┐
                                      │  Zia Ul Din's Inbox  │
                                      │ ziauldin371@gmail.com│
                                      │ • Run summary report │
                                      │ • 14h watchdog alert │
                                      └──────────────────────┘
```

### Schedule Specification
- **Morning Run**: 09:00 Asia/Karachi (04:00 UTC)
- **Evening Run**: 17:00 Asia/Karachi (12:00 UTC)
- **Cron Definition**: `0 4,12 * * *` in `.github/workflows/scheduled-run.yml`
- **Duplicate Vercel Cron**: Removed from `vercel.json` to prevent race conditions or duplicate execution.

---

## 2. Required GitHub Secrets Configuration

Before closing your laptop, ensure these two secrets are configured in your GitHub repository:

1. Navigate to: `https://github.com/ziauldin371-ai/growth-system-agent/settings/secrets/actions`
2. Add/Verify the following Repository Secrets:

| Secret Name | Value Example | Description |
| :--- | :--- | :--- |
| `APP_BASE_URL` | `https://your-growth-agent.vercel.app` | Base URL of your deployed application (no trailing slash). |
| `CRON_SECRET` | `your_high_entropy_secret_key` | Must match the `CRON_SECRET` environment variable configured in Vercel. |

---

## 3. How to Verify the Schedule is Firing

### Verification Method A: Public Health Check (No Login Required)
Run curl or open in any browser from your phone or any device:
```bash
curl -s https://<your-app-domain>/api/health | jq .
```
Expected output:
```json
{
  "status": "healthy",
  "timestampUtc": "2026-10-30T04:22:30.000Z",
  "scheduler": {
    "status": "active",
    "lastSuccessfulRunAt": "2026-10-30T04:00:15.123Z",
    "hoursSinceLastRun": 0.37,
    "thresholdHours": 14,
    "isWithinThreshold": true,
    "nextScheduledRuns": {
      "cron": "0 4,12 * * *",
      "description": "09:00 and 17:00 Asia/Karachi (04:00 and 12:00 UTC)"
    }
  },
  "database": {
    "mode": "supabase_postgresql",
    "status": "connected",
    "connected": true
  }
}
```
If `hoursSinceLastRun > 14`, the status changes to `degraded` and `scheduler.status = "stopped"`.

### Verification Method B: Manual Test via GitHub Actions (`workflow_dispatch`)
1. Go to `https://github.com/ziauldin371-ai/growth-system-agent/actions`
2. Select **Scheduled Outreach Run** in the left sidebar.
3. Click **Run workflow** -> Select branch `master` -> Click **Run workflow**.
4. Click the running workflow to view live logs. You will see:
   - Configuration validation (`APP_BASE_URL` and `CRON_SECRET`)
   - HTTP status `200`
   - Response JSON showing `leadsDiscovered`, `checkpoint`, and `runId`.

### Verification Method C: Check Supabase PostgreSQL Directly
Run this SQL query in the Supabase SQL Editor:
```sql
-- Check last 5 scheduled runs executed by the cloud
SELECT run_id, status, start_time_pkt, leads_discovered, leads_qualified, emails_sent, duration_ms, created_at 
FROM scheduler_run_history 
ORDER BY created_at DESC 
LIMIT 5;

-- Check latest batch checkpoint & cursor
SELECT * FROM scheduler_checkpoints;

-- Check distributed lock status
SELECT * FROM distributed_locks;
```

### Verification Method D: Check Your Email
After every run, the runner automatically emails a summary report to `ziauldin371@gmail.com`:
- **Subject**: `[Growth System Agent] Run Report: COMPLETED (<Day, Date>)`
- Contains: Start/finish time in PKT, leads discovered, eligible emails, skip reasons, and channels found.

---

## 4. 14-Hour Inactivity Watchdog

If GitHub Actions fails to trigger, secrets expire, or the server becomes unreachable:

1. **Dashboard Alert**:
   A prominent red warning banner is displayed across the top of the Command Center:
   > ⛔ **Scheduler Stopped — No Run in X Hours (Overdue > 14h)**
   > Direct links to workflow logs, secret settings, and `/api/health`.

2. **Automated Alert Email**:
   When the watchdog detects that `hoursSinceLastRun > 14`, an alert email is dispatched to `ziauldin371@gmail.com`:
   > **Subject**: `CRITICAL ALERT: Growth System Agent Scheduler Inactive for X Hours`

---

## 5. Bounded Batching & Postgres Checkpoint Resumption

To prevent timeouts on serverless platforms (Vercel has execution limits of 10–60s):

1. **Batch Size Limit**: Each scheduled cycle executes discovery in a bounded slice (10 leads per run).
2. **State Checkpointing**: The runner stores cursor state (`marketIndex`, `industryIndex`, `offset`) in Supabase table `scheduler_checkpoints`.
3. **Automatic Resumption**: The next scheduled cycle reads `scheduler_checkpoints` and picks up directly from the next market and page offset.
4. **Anti-Overlap Distributed Lock**: Table `distributed_locks` enforces mutual exclusion with a 10-minute TTL, ensuring simultaneous triggers never double-contact leads or corrupt state.

---

## 6. Emergency Kill Switches

### Immediate Outgoing Email Halt
1. **Dashboard**: Click **Pause Automation** on the home dashboard.
2. **Environment Variable**: Set `EMERGENCY_STOP=true` in Vercel Project Settings.
3. **Direct API Call**:
   ```bash
   curl -X POST https://<your-app>/api/automation/controls \
     -H "Content-Type: application/json" \
     -H "Cookie: growth_agent_session=<valid_jwt>" \
     -d '{"action": "pause"}'
   ```
