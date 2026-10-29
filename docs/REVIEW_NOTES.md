# Growth System Agent — Engineering Review Notes

**System**: Growth System Agent  
**Owner & Sender**: Zia Ul Din (`ziauldin371@gmail.com`)  
**Deployment Target**: Vercel (Next.js 14 App Router)  
**Database**: Supabase PostgreSQL with Row Level Security (RLS)  
**Date of Review Package**: 2026-10-30  

---

## 1. Version Control Metadata
- **Current Git Branch**: `master`
- **Last Commit Hash**: `d2f392c131cc730541e760be8a0bb5003214e155` (short: `d2f392c`)
- **Remote Repository**: `https://github.com/ziauldin371-ai/growth-system-agent.git`

---

## 2. Environment Variables Used (Names Only)
The application reads configuration from the environment without storing or baking sensitive keys into source code:

### Core Application & Auth
- `NODE_ENV`
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `ENCRYPTION_SECRET`

### Supabase Database & Auth (Multi-Tenant Persistence)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Outgoing Email & Provider Adapters
- `EMAIL_PROVIDER` (options: `gmail` | `resend` | `mock`)
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `OUTREACH_SENDER_EMAIL`
- `OUTREACH_SENDER_NAME`
- `PHYSICAL_MAILING_ADDRESS`
- `ALLOW_MOCK_DISPATCH`
- `ALLOW_SANDBOX_SEND`

### Google Gmail API & In-App OAuth
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN` (optional legacy env fallback; in-app OAuth preferred)

### Resend Email Adapter & Webhooks
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `WEBHOOK_SIGNING_SECRET`

### AI Copilot & Pitch Generation Engine
- `DEFAULT_LLM_PROVIDER` (options: `gemini` | `openai` | `mock`)
- `GEMINI_API_KEY`
- `LLM_TIMEOUT_MS`

### Business Discovery Providers
- `GOOGLE_PLACES_API_KEY`
- `COMPANIES_HOUSE_API_KEY`

### Safety Controls & Compliance
- `EMERGENCY_STOP`
- `NEXT_PUBLIC_EMERGENCY_STOP`
- `DEFAULT_SEND_MODE`
- `UNSUBSCRIBE_SECRET`
- `CRON_SECRET`

### Deliverability & Seed Inbox Probing
- `SEED_INBOXES`
- `SEED_INBOX_GMAIL`
- `SEED_INBOX_OUTLOOK`
- `SEED_INBOX_YAHOO`
- `SEED_INBOX_WORKSPACE`

---

## 3. Real vs Mock / Demo Components Breakdown

| Capability / Module | Implementation Status | Live vs Mock Classification | Details & Behavior |
| :--- | :--- | :--- | :--- |
| **Authentication & Operator Session** | Production-Ready | **REAL** | Authenticates operator (`ziauldin371@gmail.com`) with HTTP-only cookies, auto-provisions and syncs with Supabase Auth admin API. |
| **Zero-Trust Route Protection** | Production-Ready | **REAL** | Next.js Edge Middleware returns `HTTP 401 Unauthorized` for all private routes when unauthenticated. Verified via real server `curl`. |
| **PostgreSQL Schema & RLS** | Production-Ready | **REAL** | 27 tables across 5 SQL migrations. Multi-tenant Row Level Security (RLS) fully enabled; 44 tests verify User B cannot read, write, update, delete, or inject rows into User A's organization. |
| **Repository Persistence** | Production-Ready | **REAL** | Dual-layer persistence: Supabase PostgreSQL write-through with file-backed state journal (`.data/store_state.json`). Suppression and custom leads survive complete process restarts. |
| **In-App Gmail OAuth Integration** | Production-Ready | **REAL** | `/api/auth/gmail/connect` and `/api/auth/gmail/callback` handle OAuth2 consent and token exchange. Stored tokens are AES-256-GCM encrypted in the database. Catches Google `invalid_grant` revocation and updates status to `revoked`. |
| **Statutory Compliance Guard** | Production-Ready | **REAL** | Enforces sending windows (09:00 - 17:00), CAN-SPAM/PECR footers, and suppression list filtering. |
| **Strict Sandbox Guard** | Production-Ready | **REAL** | Blocks any email dispatch to sandbox leads, synthetic `.mock` domains, or non-allowlisted sources whenever the live Gmail provider is active, regardless of `NODE_ENV`. |
| **Deliverability Placement Tester** | Production-Ready | **REAL / No Simulation** | Dispatches real deliverability probe emails to configured seed inboxes via `dispatchOutreachEmail`. When seed inboxes are not configured, explicitly returns `"not_measured"` with null rates (all simulated metrics permanently deleted). |
| **Unsubscribe Opt-Out Endpoint** | Production-Ready | **REAL** | Publicly accessible via HMAC-SHA256 signed token (`/api/compliance/unsubscribe?token=...`). Rejects tampered tokens with `HTTP 400 Bad Request`. |
| **Intent Lead Radar** | Production-Ready | **REAL** | Live HTTP adapters for Algolia Hacker News Search API and public Reddit JSON feeds (`r/forhire`, `r/hiring`, `r/freelance`). Extracts live hiring posts and scores them against developer skills. |
| **Live Domain & DNS Health** | Production-Ready | **REAL** | Queries live DNS via Node.js `dns.promises` to verify SPF, DKIM, DMARC, and MX records. |
| **Pre-Send Content Linter** | Production-Ready | **REAL** | Scans email text for spam trigger words, word count bounds (60–110 words), link count (max 1), and URL shorteners. |
| **External B2B Discovery APIs** | Hybrid | **LIVE with MOCK FALLBACK** | When `GOOGLE_PLACES_API_KEY` or `COMPANIES_HOUSE_API_KEY` are provided in env, fetches live official registry/maps data. When unset, falls back to labeled demo records (`isSandboxData: true`, labeled `DEMO` in UI). |
| **Google Places Search** | Live Provider | **REAL (requires key)** | Connects to Google Places Text Search and Details APIs when key is present. |
| **Companies House Search** | Live Provider | **REAL (requires key)** | Connects to UK Companies House REST API when key is present. |
| **Gemini AI Copywriting** | Live Provider | **REAL (requires key)** | Calls Google Gemini 1.5 Pro / Flash models via `@google/genai` when `GEMINI_API_KEY` is present. Falls back to deterministic rule-based template generation when unconfigured. |
