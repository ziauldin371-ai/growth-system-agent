# Supabase PostgreSQL & Auth Setup Guide

This document describes the exact steps to configure, migrate, and verify the Supabase PostgreSQL database for Growth System Agent.

---

## 1. Create a Supabase Project

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project** and select your organization.
3. Configure project details:
   - **Name:** `growth-system-agent`
   - **Database Password:** Generate and securely store a strong password.
   - **Region:** Select a region close to your target operations (e.g. `us-east-1` or `eu-west-1`).
4. Wait for database provisioning (usually takes 1–2 minutes).

---

## 2. Obtain Credentials

Navigate to **Project Settings** → **API** in the Supabase dashboard and copy:

- **Project URL:** `https://<your-project-ref>.supabase.co`
  → Set as `NEXT_PUBLIC_SUPABASE_URL`
- **Project API Keys → `anon` `public`:**
  → Set as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Project API Keys → `service_role` `secret`:**
  → Set as `SUPABASE_SERVICE_ROLE_KEY` (Keep secret! Never commit to git).

Add these values to your Vercel Environment Variables and local `.env.local`.

---

## 3. Apply Ordered Migrations

The repository contains 7 ordered migrations in `supabase/migrations/`:

| # | Migration File | Description |
|---|---|---|
| `00` | `20261030000000_init_schema.sql` | Core schema: businesses, contacts, drafts, evidence, campaigns, suppression |
| `01` | `20261030000001_seed_icp_profiles.sql` | Initial ICP profiles and opportunity scoring definitions |
| `02` | `20261030000002_alternative_channels_and_runs.sql` | Multi-channel manual outreach channels & run history |
| `03` | `20261030000003_realtime_discovery_and_platforms.sql` | Real-time discovery feed, search plan coverage |
| `04` | `20261030000004_intent_radar_and_hot_leads.sql` | Hot intent radar, commercial signals, and community feeds |
| `05` | `20261030000005_rls_multi_tenant_complete_and_oauth.sql` | Full Row-Level Security (RLS) policies and encrypted OAuth tokens |
| `06` | `20261030000006_distributed_locks_and_checkpoints.sql` | Distributed Postgres locks with expiry and cloud resumption checkpoints |

### Option A: Supabase Web SQL Editor (Recommended)
1. In the Supabase Dashboard, open **SQL Editor**.
2. Run each migration file in numerical order from `00` to `06`.
3. Verify that all tables are created under the `public` schema.

### Option B: Supabase CLI
```bash
# Link project
npx supabase link --project-ref <your-project-ref>

# Push all migrations
npx supabase db push
```

### Option C: Migration Helper Script
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/apply-supabase-migrations.mjs
```

---

## 4. Multi-Tenant Row Level Security (RLS) Verification

All tables have RLS enabled with strict tenant isolation:
- User A (Organization A) can only read and write rows where `organization_id` matches their tenant.
- User B cannot read or modify User A's leads, drafts, or suppression entries.
- Automated tests in `src/services/security/__tests__/rls-multi-tenant-isolation.test.ts` verify 44 distinct multi-tenant permission permutations.

---

## 5. Verify Database Connectivity in Growth System Agent

Once configured, verify connectivity via the public health endpoint:
```bash
curl -s https://growth-system-agent-brown.vercel.app/api/health
```

Expected JSON response:
```json
{
  "status": "healthy",
  "database": {
    "mode": "supabase_postgresql",
    "status": "connected",
    "connected": true
  }
}
```

When connected:
- The red "Database not connected" banner on the Home dashboard disappears.
- Real-time discovery and autonomous outbound processing are enabled.
