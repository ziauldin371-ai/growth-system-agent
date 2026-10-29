# GrowthSignal AI — Operational Runbook

## 1. Emergency Procedures

### Immediate Outgoing Email Halt (Kill Switch)
If an unauthorized dispatch, delivery anomaly, or compliance violation occurs:

1. **Activate Environment Kill Switch**:
   ```bash
   # Set in your production environment (Vercel, Railway, Docker, or .env)
   EMERGENCY_STOP=true
   ```
2. **Reload Application / Restart Worker**:
   The `complianceGuard.verifySendEligibility` routine checks `EMERGENCY_STOP` on every single outgoing message. All pending dispatches are immediately rejected with status `rejected_compliance` and code `EMERGENCY_STOP`.
3. **Verify Suppression**:
   Check the `/compliance` dashboard page or query `suppression_list` table to ensure offending emails or domains are permanently suppressed.

---

## 2. Database Backup & Restore Procedures

### Supabase CLI Backup
```bash
# Dump complete schema and data
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql --role postgres

# Dump data only
supabase db dump --data-only -f data_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Supabase CLI Restore
```bash
# Restore to local or staging database
psql -h db.your-project.supabase.co -U postgres -d postgres -f backup_20261030_000000.sql
```

---

## 3. Database Migration & Rollback Procedures

### Applying Migrations
Migrations are stored sequentially in `supabase/migrations/`:
```bash
# Apply new migrations to active Supabase project
supabase db push
```

### Rollback Strategy
Each migration contains explicit rollback counterparts. To roll back an applied schema change:
1. Identify the offending migration timestamp in `supabase/migrations/`.
2. Author a compensating rollback migration:
   ```sql
   -- Example: rollback table addition
   DROP TABLE IF EXISTS offending_table CASCADE;
   ```
3. Commit and run `supabase db push`.

---

## 4. Background Job Queue Operations

### Inspecting Stuck or Failed Jobs
1. Navigate to `/jobs` in the GrowthSignal AI dashboard.
2. Filter by status: `dead_letter` or `failed`.
3. Inspect `errorMessage` and `retryCount`.

### Reprocessing Dead-Letter Jobs
To re-enqueue a dead-letter job after addressing external network or API issues:
```bash
# Query API to retry specific job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"jobType": "discovery_crawl", "payload": {"market": "US", "industry": "HVAC", "targetPipeline": "both"}}'
```
