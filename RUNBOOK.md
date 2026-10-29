# Growth System Agent — Operational Runbook

> **Operator**: Zia Ul Din (`ziauldin371@gmail.com`)  
> **Repository**: [github.com/ziauldin371-ai/growth-system-agent](https://github.com/ziauldin371-ai/growth-system-agent)  
> **Deployment**: Vercel & Supabase  

---

## 1. Emergency Procedures & Kill Switches

### Immediate Outgoing Email Halt (Emergency Stop)
If an unauthorized dispatch, delivery anomaly, or compliance violation occurs:

1. **Dashboard Kill Switch**:
   Click the **Pause Automation** button in the dashboard or execute:
   ```bash
   curl -X POST https://your-deployment.vercel.app/api/automation/controls \
     -H "Content-Type: application/json" \
     -d '{"action": "pause"}'
   ```
2. **Environment Kill Switch**:
   Set `EMERGENCY_STOP=true` in Vercel Project Settings or local `.env`:
   ```bash
   EMERGENCY_STOP=true
   ```
   The `complianceGuard.verifySendEligibility` routine checks `EMERGENCY_STOP` on every single outgoing message. All pending dispatches are immediately rejected with status `rejected_compliance` and code `EMERGENCY_STOP`.
3. **Emergency Unsubscribe / Suppression**:
   Add offending emails or entire domains to the suppression list via the `/compliance` page or:
   ```bash
   curl -X POST https://your-deployment.vercel.app/api/compliance/suppression \
     -H "Content-Type: application/json" \
     -d '{"type": "domain", "value": "example.com", "reason": "Operator Emergency Suppression"}'
   ```

---

## 2. Operating Modes & Daily Controls

The platform supports 3 runtime operating modes via `/api/automation/controls`:

### Switching Modes
```bash
# 1. Switch to strict Draft-Only Approval Mode (Default)
curl -X POST https://your-deployment.vercel.app/api/automation/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "set_mode", "mode": "approval"}'

# 2. Switch to Research Only Mode (Discovery only; no drafts)
curl -X POST https://your-deployment.vercel.app/api/automation/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "set_mode", "mode": "research"}'

# 3. Switch to Controlled Auto-Send Mode
curl -X POST https://your-deployment.vercel.app/api/automation/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "set_mode", "mode": "auto_send"}'
```

### Triggering an Immediate Run Manually
```bash
curl -X POST https://your-deployment.vercel.app/api/automation/controls \
  -H "Content-Type: application/json" \
  -d '{"action": "run_now"}'
```

---

## 3. Scheduled Automation Operations

### Twice-Daily Schedule
- **09:00 PKT / 04:00 UTC**
- **17:00 PKT / 12:00 UTC**

### Triggering Scheduled Run Endpoint
```bash
curl -X GET "https://your-deployment.vercel.app/api/cron/scheduled-run" \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"
```

### GitHub Actions Fallback Workflow
Template located at `templates/workflows/scheduled-run.yml`.
To activate, copy to `.github/workflows/scheduled-run.yml` and ensure the following GitHub Action Secrets are configured:
- `APP_BASE_URL`: e.g. `https://growth-system-agent.vercel.app`
- `CRON_SECRET`: Matches `CRON_SECRET` configured in Vercel.

---

## 4. Gmail API OAuth2 Credentials Setup

To authorize sending from `ziauldin371@gmail.com`:

1. **Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com).
   - Create or select a project.
   - Enable the **Gmail API** under *APIs & Services > Library*.
2. **OAuth Consent Screen**:
   - Set User Type to *External* (or *Internal* if Google Workspace).
   - Add test user `ziauldin371@gmail.com`.
   - Add scope: `https://www.googleapis.com/auth/gmail.send`.
3. **OAuth Client ID**:
   - Create Credentials > OAuth client ID > Web application.
   - Authorized redirect URI: `https://developers.google.com/oauthplayground`.
4. **Obtain Refresh Token**:
   - Open [Google OAuth2 Playground](https://developers.google.com/oauthplayground).
   - In settings (gear icon), check *Use your own OAuth credentials* and enter your Client ID and Client Secret.
   - Select & authorize `https://www.googleapis.com/auth/gmail.send`.
   - Exchange authorization code for tokens, copy the `refresh_token`.
5. **Configure Environment**:
   ```bash
   GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your_client_secret"
   GOOGLE_REFRESH_TOKEN="your_refresh_token"
   OUTREACH_SENDER_EMAIL="ziauldin371@gmail.com"
   OUTREACH_SENDER_NAME="Zia Ul Din | AI & Automation Solutions"
   ```

5. **Verify with Test Email Dispatch**:
   In the dashboard, navigate to `/settings` and use the **Gmail API OAuth2 Verification & Test Send** card, or run:
   ```bash
   curl -X POST https://your-deployment.vercel.app/api/gmail/test-send \
     -H "Content-Type: application/json" \
     -d '{"recipientEmail": "ziauldin371@gmail.com"}'
   ```
   Confirm that the test message appears in your Google account's Sent folder.

---

## 5. Database Backup & Restore

### Supabase CLI Backup
```bash
# Dump complete schema and data
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql --role postgres

# Dump data only
supabase db dump --data-only -f data_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Supabase CLI Restore
```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f backup_file.sql
```

---

## 6. Verification & Quality Gates

Run these commands before any deployment or pull request:
```bash
# Unit & integration tests (67 passing tests across 18 test suites)
npm test

# Strict TypeScript type check
npm run typecheck

# Lint checks
npm run lint

# Production build
npm run build
```
