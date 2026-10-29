# Growth System Agent

> **Autonomous Lead Generation & B2B Opportunity Pipeline Engine**  
> Custom-built for **Zia Ul Din** — Full Stack AI Developer & Automation Architect | LLMs & Python | Data Science  
> Sender Identity: `Zia Ul Din | AI & Automation Solutions <ziauldin371@gmail.com>`  
> Repository: [github.com/ziauldin371-ai/growth-system-agent](https://github.com/ziauldin371-ai/growth-system-agent)  
> Deployment Target: **Vercel** + **Supabase**

---

## Executive Summary

**Growth System Agent** is an autonomous, production-oriented B2B discovery, verification, qualification, and outreach platform. Designed specifically to showcase and win client engagements for Zia Ul Din's technical development services, the system operates two dedicated client acquisition pipelines:

1. **Pipeline A — Website Opportunities**  
   Discovers legitimate, active, growing businesses across the United States, United Kingdom, Canada, Australia, and international markets that have verified commercial transactions, customer reviews, or business registrations, but **lack a verified functional website** (apparently absent, broken, or operating solely via social media). Qualifies them for custom modern web development, online booking workflows, and local digital presence.

2. **Pipeline B — AI & Software Opportunities**  
   Discovers startups, SaaS companies, and digital agencies showing verified demand for **AI automation, LLM integrations, RAG systems, AI agents, Python data pipelines, data science, custom APIs, and full-stack software development**. Qualifies them through verified technical signals, job postings, or workflow bottlenecks.

---

## Core Operating Modes & Safety Architecture

The system features three distinct operational modes, configurable in real time via the dashboard:

| Operating Mode | Behavior & Safeguards | Default Status |
| :--- | :--- | :--- |
| **`approval`** | **Human-in-the-Loop Mode**: System runs discovery, SSRF website verification, ICP scoring, and AI draft generation. All generated emails are held in the Approval Queue for manual review before sending. | **DEFAULT ACTIVE MODE** |
| **`research`** | **Silent Intelligence Mode**: System discovers and qualifies leads, logs evidence, but suppresses all AI drafting and sending. Ideal for market exploration. | Configurable |
| **`auto_send`** | **Autonomous Controlled Mode**: System autonomously approves and dispatches outreach to verified leads, strictly governed by domain rate limits, quiet business hours, and suppression lists. | Admin Opt-In Only |

### Critical Safety Guardrails
- **Zero Hallucination Policy**: Revenue, employee headcount, and business needs are never invented. Unverified fields are strictly marked unknown.
- **SSRF & DNS Rebinding Defense**: Every website verification check re-resolves DNS and validates destination IPs against RFC 1918 private, loopback, link-local, and cloud metadata (`169.254.169.254`) ranges on every single redirect hop.
- **Prompt Injection Defense**: Untrusted external evidence is sanitized and enclosed in randomized boundary nonces (`<<<UNTRUSTED_EVIDENCE_{NONCE}>>>`) with explicit directives prohibiting instruction overrides.
- **Strict Domain Velocity Limits**: Hard limit of **maximum 3 emails per domain per day** to eliminate spam risk and preserve sender reputation.
- **Statutory Compliance**: Automated physical mailing address disclosure, instant one-click unsubscribe links, permanent suppression register, CAN-SPAM and GDPR alignment.
- **Global Emergency Stop**: One-click dashboard kill-switch and `EMERGENCY_STOP=true` environment variable to immediately halt all campaign dispatches.

---

## Twice-Daily Automated Scheduling (PKT & UTC)

The Growth System Agent is configured to run autonomously twice per day:
- **Morning Run**: 09:00 PKT (04:00 UTC)
- **Evening Run**: 17:00 PKT (12:00 UTC)

### Dual-Layer Cron Architecture:
1. **Vercel Cron (`vercel.json`)**:
   Configured for once-daily execution at 09:00 PKT (04:00 UTC) to comply with Vercel's Hobby plan limit:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/scheduled-run",
         "schedule": "0 4 * * *"
       }
     ]
   }
   ```
2. **GitHub Actions Workflow (`templates/workflows/scheduled-run.yml`)**:
   Runs twice daily without restriction (`0 4,12 * * *` at 09:00 & 17:00 PKT) triggering `/api/cron/scheduled-run` with `CRON_SECRET`. Copy to `.github/workflows/scheduled-run.yml` to run the evening schedule for free.
3. **Anti-Overlap Distributed Locking**:
   Uses `scheduler_global_run_lock` with a 10-minute TTL to ensure duplicate scheduled invocations never run concurrently.

---

## Email Dispatch Architecture (Official Gmail REST API)

For personal `@gmail.com` accounts, Google deprecated insecure application passwords in favor of Google OAuth2 client credentials. Growth System Agent includes a dedicated, production-ready **Gmail API Provider** (`GmailProvider`):

- **Sender Address**: `ziauldin371@gmail.com`
- **Sender Name**: `Zia Ul Din | AI & Automation Solutions`
- **OAuth2 Token Refresh**: Automatically exchanges `GOOGLE_REFRESH_TOKEN` with Google's OAuth endpoint (`https://oauth2.googleapis.com/token`) for short-lived access tokens.
- **MIME Multipart RFC 2822 Encoding**: Formats messages with both clean plain-text and responsive HTML bodies, URL-safe base64-encoded to `users/me/messages/send`.
- **Fallback Providers**: Automatically cascades from Gmail API -> Resend -> Safe Mock Provider (for offline development/testing).

---

## Core Dashboard Sections

The dashboard is structured into dedicated operational command views:

1. **Overview & Analytics (`/`)**: Real-time KPI counters (discovered leads, eligible email contacts, sent messages, multi-channel targets, confirmed deliveries, replies) and manual controls.
2. **Worldwide Leads (`/leads`)**: Multi-dimensional directory with filters for Country/Region (US, UK, CA, AU, EU, Worldwide), Industry, Pipeline (Pipeline A vs B), Lead Score, and Email Availability.
3. **Ready for Email (`/ready-for-email`)**: High-intent contacts satisfying 100% of sending criteria with detailed explainability badges.
4. **Sent Emails (`/sent-emails`)**: Audit log of messages submitted through the Gmail REST API, including Gmail message IDs and direct links to view the email inside your Google account's Sent mailbox (`https://mail.google.com/mail/u/0/#sent/...`).
5. **Other Outreach Opportunities (`/other-channels`)**: Businesses with discovered alternative professional channels (LinkedIn, X, Instagram, Web Contact Forms), featuring platform-tailored pitches and 1-click &ldquo;Copy Pitch&rdquo; buttons.
6. **Email Sent + Other Channels (`/email-sent-plus-channels`)**: Dedicated multi-touch follow-up center for businesses that have already received an email and have other verified channels, complete with follow-up pitches and reminder pickers.
7. **No Email Available (`/no-email`)**: Preserves businesses without usable direct emails so high-value opportunities can be contacted manually via form or social profiles.
8. **Run History & Errors (`/history`)**: Execution telemetry displaying start/finish times in **Asia/Karachi time**, sources processed, leads discovered, emails queued, and filtered reasons.
9. **Private Operator Authentication (`/login`)**: Protected by server-side middleware and encrypted HTTP-only session cookies restricted to `ziauldin371@gmail.com`.

---

## Technology Stack

- **Framework**: Next.js 14 App Router, React 18, TypeScript (Strict Mode).
- **Styling**: Tailwind CSS, Lucide Icons, Responsive Mobile-Friendly Dashboard.
- **Database & Auth**: Supabase PostgreSQL with 18 relational tables, Row Level Security (RLS), and in-memory mock fallback.
- **Validation**: Zod runtime schema validation for all endpoints, LLM outputs, and payloads.
- **AI Engine**: Google Gemini 1.5 Pro / Flash with structured JSON output and prompt injection firewalls; deterministic mock fallback for zero-cost testing.
- **Testing**: Vitest (67 passing unit and integration tests across 18 test suites) and Playwright for browser e2e testing.

---

## Quickstart & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ziauldin371-ai/growth-system-agent.git
cd growth-system-agent
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(The system works immediately out-of-the-box with zero credentials required; mock adapters provide safe deterministic behavior.)*

### 3. Run Verification Tests & Quality Gates
```bash
# Run Vitest test suite (67 passing unit & integration tests across 18 test suites)
npm test

# Run strict TypeScript type verification
npm run typecheck

# Run Next.js production linter
npm run lint

# Run production build
npm run build
```

### 4. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Growth System Agent Dashboard.

---

## External Credentials & Production Setup Checklist

To enable live production integrations on Vercel:

| Provider | Variable(s) | Description / Acquisition Guide |
| :--- | :--- | :--- |
| **Gmail API** | `GOOGLE_CLIENT_ID`<br/>`GOOGLE_CLIENT_SECRET`<br/>`GOOGLE_REFRESH_TOKEN` | Enable Gmail API in Google Cloud Console, create OAuth 2.0 Web Client credentials, and authorize with `https://www.googleapis.com/auth/gmail.send`. |
| **Sender Email** | `OUTREACH_SENDER_EMAIL`<br/>`OUTREACH_SENDER_NAME` | Defaults to `ziauldin371@gmail.com` and `Zia Ul Din \| AI & Automation Solutions`. |
| **Scheduler Secret** | `CRON_SECRET` | Generate a strong random token (`openssl rand -hex 32`) to secure `/api/cron/scheduled-run`. |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`<br/>`NEXT_PUBLIC_SUPABASE_ANON_KEY`<br/>`SUPABASE_SERVICE_ROLE_KEY` | Create a free Supabase project and execute `supabase/migrations/*.sql`. |
| **Google Gemini** | `GEMINI_API_KEY` | Obtain from Google AI Studio (`aistudio.google.com`). |
| **Discovery APIs** | `GOOGLE_PLACES_API_KEY`<br/>`COMPANIES_HOUSE_API_KEY` | Optional APIs for live US/UK corporate directory searches. |

---

## Vercel Deployment Guide

1. **Push Code to GitHub**:
   Ensure all commits are pushed to `origin master`.
2. **Import Repository in Vercel**:
   Go to [vercel.com/new](https://vercel.com/new) and select `growth-system-agent`.
3. **Configure Environment Variables**:
   Add all variables from `.env.example` in the Vercel Project Settings.
4. **Deploy**:
   Click **Deploy**. Vercel will automatically detect Next.js App Router and activate `vercel.json` cron jobs.
5. **Add GitHub Actions Secret**:
   In your GitHub repository settings (`Settings -> Secrets and variables -> Actions`), add `APP_BASE_URL` (your Vercel production URL) and `CRON_SECRET` to enable the scheduled fallback workflow.

---

## License

Built and maintained by **Zia Ul Din**. All rights reserved.
