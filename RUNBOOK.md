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

## 6. Real-Time Discovery, Deliverability & Multi-Platform Outreach

### A. 48-Hour Freshness Rule & Closed Business Detection
* Every lead must pass `enforceLeadFreshness()`:
  - If last verification check is older than 48 hours, automatic re-verification is triggered.
  - Closed or permanently closed businesses (`isPermanentlyClosed = true` or Google Places `CLOSED_PERMANENTLY`) are automatically rejected.
  - Heat score is computed factoring in registration freshness, review signals, and reachability.
* Real-time feed is queryable at `GET /api/discovery/feed`.

### B. Gmail Sent Confirmation
* Outreach messages sent via `users.messages.send` are immediately verified with `users.messages.get` to confirm the `SENT` label.
* The message is stamped with `gmailConfirmed: true` and direct link to `https://mail.google.com/mail/u/0/#sent/{messageId}`.
* In case of network timeout, the reconciliation engine queries `users.messages.list` with `to:{email} label:SENT` to avoid duplicate dispatches.

### C. Inbox Placement & Content Linter
* Pre-send content linter (`lintEmailContent()`) enforces:
  - Word count: 60–110 words recommended (rejects > 125 words).
  - Maximum 1 link on first touch; zero URL shorteners allowed.
  - Zero spam trigger keywords ("guaranteed", "100% free", "risk-free", etc.).
  - Plain-text opt-out footer required.
* Domain health checker (`POST /api/deliverability/dns-check`) queries live DNS for SPF, DKIM, DMARC (`v=DMARC1`), and MX records.

### D. Multi-Platform Outreach & Cross-Channel Quiet Periods
* Outreach pitches generated per platform rules:
  - **LinkedIn Connection Note**: Max 300 characters, no pitch, 1 genuine point, no links.
  - **Instagram / Facebook DM**: 30–60 words, casual yet professional, no links.
  - **X (Twitter) DM**: Under 280 characters.
  - **Website Contact Form**: 60–100 words with explicit Subject line.
* **3-Day Quiet Period**: When any channel is marked as contacted, a 72-hour cross-channel spacing window is scheduled across all other channels for that lead.
* **Instant Opt-Out Lock**: If a lead opts out or replies negatively on any channel, clicking **Opt Out / Lock** immediately locks all alternative channels and adds the lead's domain and email to the global suppression list.

---

## 7. Intent-Based Lead Radar ("People Looking for My Skills Right Now")

### A. Live Intent Sources & Polling
* **Hacker News (Algolia API)**: Automatically polls "Ask HN: Who is hiring?", "Seeking freelancer", and keyword queries for Python automation, RAG, and LLM development.
* **Reddit Developer Subreddits**: Queries public JSON endpoints on `r/forhire`, `r/hiring`, `r/LocalLLaMA`, `r/startups`, and `r/automation`.
* **Remote Feeds**: Direct API integration with Remotive and RemoteOK for active contract/freelance software engineering roles.
* **Manual Quick Add**: Allows pasting raw post URLs and text from LinkedIn, Upwork, Discord, Facebook, or Telegram via the modal on `/hot-opportunities` or `POST /api/intent/quick-add`.

### B. Classification & Anti-Scam Verification
* Every raw lead is processed through `classifyRawIntentPost()`:
  - Validates `intent_type`: `explicit_hire_request`, `job_posting`, `recommendation_request`, `partnership_request`.
  - Matches skills against Zia's specializations (AI Agents, LLM/RAG, Python automation, Data Science, Full-Stack SaaS, Websites).
  - Scam & Fraud Filter: Automatically flags advance-fee traps, crypto pump-and-dump schemes, multi-week unpaid trials, and off-platform payment lures. Posts with legitimacy score $< 60$ are hidden.
  - Computes `fit_score` (0–100) with 0–48 hour hot-window priority.

### C. Community Rules & Pitch Modes
* Tailored pitch generator (`generateIntentPitch()`):
  - **Reddit / HN Public Reply**: 40–90 words, addresses the problem first, zero boilerplate marketing, includes 1 clarifying technical question.
  - **Marketplace Proposal (Upwork/Contra)**: 120–180 words, 3-step structured sprint roadmap (Days 1–3, Days 4–8, Days 9–10), includes timeline and deliverables.
  - **Direct Email**: Under 110 words with soft ask.
* Action buttons on each card: **Copy Pitch**, **Open Thread / Job Post**, **Mark as Contacted**, **Dismiss**.

---

## 8. Verification & Quality Gates

Run these commands before any deployment or pull request:
```bash
# Unit & integration tests (85 passing tests across 23 test suites)
npm test

# Strict TypeScript type check
npm run typecheck

# Lint checks
npm run lint

# Production build
npm run build
```
