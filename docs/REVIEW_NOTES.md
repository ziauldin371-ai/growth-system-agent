# Growth System Agent — Engineering Review Notes

**System**: Growth System Agent  
**Owner & Operator**: Zia Ul Din (`ziauldin371@gmail.com`)  
**Deployment Target**: Vercel (Next.js 14 App Router)  
**Database**: Supabase PostgreSQL with Row Level Security (RLS)  
**Date of Review Package**: 2026-10-31  

---

## 1. Version Control Metadata
- **Current Git Branch**: `stitch-ui`
- **Last Commit Hash**: `a3e67b33cc7b44befd76c0da81a4762de2dd3e99` (short: `a3e67b3`)
- **Last Commit Message**: `fix(ui): remove emergency stop from top header, clarify full autonomous mode, set worldwide defaults`
- **Remote Repository**: `https://github.com/ziauldin371-ai/growth-system-agent.git`

---

## 2. Environment Variables Used (Names Only)
The application reads all configuration dynamically from the environment without storing or baking sensitive keys into source code:

### Core Application & Authentication
- `NODE_ENV`
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `ENCRYPTION_SECRET`

### Supabase Database & Multi-Tenant Persistence
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

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
- `GOOGLE_REFRESH_TOKEN` (optional env fallback; in-app OAuth preferred)

### Resend Email Adapter & Webhooks
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `WEBHOOK_SIGNING_SECRET`

### AI Copilot & Pitch Generation Engine
- `DEFAULT_LLM_PROVIDER` (options: `gemini` | `openai` | `mock`)
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `LLM_TIMEOUT_MS`

### Business Discovery Providers
- `GOOGLE_PLACES_API_KEY`
- `COMPANIES_HOUSE_API_KEY`
- `PLACES_MONTHLY_BUDGET`

### Safety Controls, Automation & Compliance
- `EMERGENCY_STOP`
- `NEXT_PUBLIC_EMERGENCY_STOP`
- `DEFAULT_SEND_MODE` (options: `auto_send` | `approval` | `research`)
- `AUTO_SEND_ENABLED`
- `DAILY_EMAIL_LIMIT`
- `SENDING_WINDOW_START_HOUR`
- `SENDING_WINDOW_END_HOUR`
- `RATE_LIMIT_DELAY_SECONDS`
- `UNSUBSCRIBE_SECRET`
- `CRON_SECRET`

### Deliverability & Seed Inbox Probing
- `SEED_INBOXES`
- `SEED_INBOX_GMAIL`
- `SEED_INBOX_OUTLOOK`
- `SEED_INBOX_YAHOO`
- `SEED_INBOX_WORKSPACE`

---

## 3. Real vs Mock / Demo Features Breakdown

| Capability / Module | Implementation Status | Live vs Mock Classification | Details & Behavior |
| :--- | :--- | :--- | :--- |
| **Google Stitch UI Architecture** | Production-Ready | **REAL** | Rebuilt exactly from 5 Stitch designs with Tailwind CSS tokens, supporting 360px mobile up to 1920px laptop screens. English & Roman Urdu language toggle, light/dark themes, and command palette (⌘K). |
| **Authentication & Operator Session** | Production-Ready | **REAL** | Authenticates operator (`ziauldin371@gmail.com`) with signed HTTP-only cookies (`SESSION_SECRET`), constant-time password comparison, and auto-provisioned Supabase Auth sync. |
| **Zero-Trust Route Protection** | Production-Ready | **REAL** | Next.js Edge Middleware returns `HTTP 401 Unauthorized` for all private routes when unauthenticated. Verified via security test suite. |
| **PostgreSQL Schema & RLS** | Production-Ready | **REAL** | 7 ordered SQL migrations in `supabase/migrations/`. Multi-tenant Row Level Security (RLS) enabled on all tables; 44 tests verify complete isolation between tenants. |
| **Cloud Autonomous Scheduler** | Production-Ready | **REAL** | Background autonomous worker runs on schedule (09:00 & 17:00 PKT / 04:00 & 12:00 UTC) via Vercel Cron or GitHub Actions with Bearer `CRON_SECRET`. Acquires distributed Postgres lock (`scheduler_global_run_lock`) with 10-minute TTL to prevent concurrent runs. |
| **Multi-Platform Contact Discovery** | Production-Ready | **REAL** | Scrapes business websites using SSRF-safe HTML parser to extract LinkedIn profiles, WhatsApp numbers, Instagram pages, Facebook pages, and Twitter/X handles. |
| **Direct Leads (WhatsApp & Social)** | Production-Ready | **REAL** | Discovered businesses without email are curated with 1-click WhatsApp (`wa.me`), LinkedIn InMail, Instagram DM, and telephone call buttons with tailored platform-specific pitches. |
| **In-App Gmail OAuth Integration** | Production-Ready | **REAL** | `/api/auth/gmail/connect` and `/api/auth/gmail/callback` handle OAuth2 consent and token exchange. Stored tokens are AES-256-GCM encrypted in database. Catches Google `invalid_grant` revocation and updates status to `revoked`. |
| **Statutory Compliance Guard** | Production-Ready | **REAL** | Enforces sending windows (09:00 - 17:00 recipient local time), CAN-SPAM physical address, one-click HMAC-signed unsubscribe headers, and global suppression list filtering. |
| **Strict Sandbox Guard** | Production-Ready | **REAL** | Blocks any email dispatch to demo/sandbox leads or synthetic `.mock` domains whenever the live Gmail provider is active. Prevents simulated contacts from receiving real emails. |
| **Deliverability Placement Tester** | Production-Ready | **REAL / No Simulation** | Dispatches real deliverability probe emails to configured seed inboxes via `dispatchOutreachEmail`. When seed inboxes are not configured, explicitly returns `"not_measured"` with null rates (zero simulated metrics). |
| **Unsubscribe Opt-Out Endpoint** | Production-Ready | **REAL** | Publicly accessible via HMAC-SHA256 signed token (`/api/compliance/unsubscribe?token=...`). Rejects tampered tokens with `HTTP 400 Bad Request`. |
| **Intent Lead Radar** | Production-Ready | **REAL** | Live HTTP adapters for Algolia Hacker News Search API and public Reddit JSON feeds (`r/forhire`, `r/hiring`, `r/freelance`). Extracts live hiring posts and scores them against developer skills. |
| **Live Domain & DNS Health** | Production-Ready | **REAL** | Queries live DNS via Node.js `dns.promises` to verify SPF, DKIM, DMARC, and MX records. |
| **Pre-Send Content Linter** | Production-Ready | **REAL** | Scans email text for spam trigger words, word count bounds (60–110 words), link count (max 1), and URL shorteners. |
| **External B2B Discovery APIs** | Hybrid | **LIVE with DEMO FALLBACK** | When `GOOGLE_PLACES_API_KEY` is provided, queries Google Places API (New) for verified global commercial businesses. When unset, falls back to clearly labeled demo records (`DEMO` badge in UI, flagged in data layer). |
| **Gemini AI Copywriting** | Hybrid | **LIVE with TEMPLATE FALLBACK** | Calls Google Gemini 2.5 Flash / 1.5 Pro models via `@google/genai` when `GEMINI_API_KEY` is present. Falls back to deterministic rule-based template generation when key is unconfigured. |
