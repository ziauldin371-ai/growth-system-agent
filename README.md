# GrowthSignal AI

> **Autonomous B2B Opportunity Pipeline & Grounded Outreach Engine**  
> Tailored for Full Stack AI Developers & Automation Architects specializing in LLMs, Python, Data Science, AI Agents, Workflow Automation, Custom APIs, and Full-Stack SaaS Engineering.

---

## Executive Summary

GrowthSignal AI is an autonomous, production-oriented B2B discovery, verification, and outreach platform. It systematically finds businesses across the US, UK, Canada, Australia, and international markets, analyzes verified operational evidence, and routes qualified prospective clients into two distinct pipelines:

1. **Pipeline A — Website Opportunities**  
   Identifies active commercial businesses (local trades, commercial services, clinics) that possess verified transactional activity, steady customer review velocity, or corporate registrations, but **lack a verified functional website** (apparently absent, parked, or operating solely through social channels). Qualifies them for custom web platforms, automated appointment booking, and local search presence.

2. **Pipeline B — AI & Software Opportunities**  
   Identifies startups, SaaS companies, and digital agencies showing verified demand for **LLM integrations, RAG systems, Python data pipelines, automation workflows, custom APIs, and full-stack software engineering**. Qualifies them through documented public hiring signals, tech stack changes, or stated manual bottlenecks.

---

## Architectural Principles & Guardrails

- **Zero Hallucination Policy**: The system never invents revenue figures, funding sums, employee counts, customer numbers, or software needs. Inaccessible data is marked as unknown rather than evidence of growth or inactivity.
- **SSRF & DNS Rebinding Defense**: Every website verification probe re-resolves destination hostnames and re-validates target IP addresses against private (RFC 1918), loopback, link-local, cloud metadata (`169.254.169.254`), and multicast ranges **on every redirect hop**.
- **Prompt Injection Defense**: Scraped external text and third-party notes are treated as untrusted data. They are sanitized, wrapped in cryptographic boundary tags with random nonces, and paired with strict directives prohibiting command execution.
- **Strict Draft-Only Approval Gate**: The platform operates in draft-only mode by default. Real email delivery requires explicit authenticated administrator approval.
- **Statutory Compliance**: Enforces CAN-SPAM (15 U.S.C. 7704), UK PECR, and GDPR rules. Includes automated physical mailing office disclosures, one-click unsubscribe links, sending windows (09:00–17:00), daily send caps, and permanent suppression registers.
- **CSV Formula Injection Sanitization**: All CSV export fields starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are neutralized to prevent arbitrary command execution in Excel/Google Sheets.

---

## Technology Stack

- **Frontend / Dashboard**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend Architecture**: Next.js Route Handlers (`src/app/api/...`) backed by modular domain services (`src/services/...`).
- **Database & Persistence**: Supabase PostgreSQL with Row Level Security (RLS), multi-tenant isolation, and a high-speed In-Memory fallback store for zero-credential development and offline testing.
- **Runtime Validation**: Zod runtime schema validation on all API requests, provider outputs, and environment variables.
- **Job Reliability**: Durable background job queue with worker concurrency limits, exponential backoff, jitter, and dead-letter queueing.
- **Testing**: Vitest for unit & integration testing (37 passing tests); Playwright for end-to-end browser flows.

---

## Repository Structure

```
├── e2e/                             # Playwright browser end-to-end test specs
├── scripts/                         # Database seeding and migration utilities
│   └── seed.mjs
├── src/
│   ├── app/                         # Next.js App Router (UI & API endpoints)
│   │   ├── api/                     # REST API Route Handlers
│   │   │   ├── analytics/           # Overview KPI stats & provider status
│   │   │   ├── businesses/          # Leads search, single dossier, CSV export
│   │   │   ├── campaigns/           # Campaign creation & batch dispatch
│   │   │   ├── compliance/          # Suppression list & public unsubscribe
│   │   │   ├── discovery/           # Multi-market discovery crawl triggers
│   │   │   ├── jobs/                # Durable job queue status & triggers
│   │   │   └── outreach/            # AI draft generation & approval gate
│   │   ├── approval-queue/          # Human-in-the-loop review station
│   │   ├── businesses/[id]/         # Detailed Business Dossier & Provenance
│   │   ├── campaigns/               # Campaign Dispatcher & Telemetry
│   │   ├── compliance/              # Compliance & Suppression Center
│   │   ├── discovery/               # Lead Discovery Hub
│   │   ├── jobs/                    # Live Background Job Queue Monitor
│   │   ├── pipeline-a/              # Pipeline A: Website Opportunities
│   │   ├── pipeline-b/              # Pipeline B: AI & Software Opportunities
│   │   ├── settings/                # Integrations & Safety Guardrails
│   │   ├── globals.css              # Dark-mode styling and gradients
│   │   ├── layout.tsx               # Root SaaS shell layout
│   │   └── page.tsx                 # Overview & Pipeline Analytics Command Center
│   ├── components/layout/           # Responsive Sidebar & Header components
│   ├── lib/
│   │   ├── supabase/                # Browser, server, and service-role admin clients
│   │   └── validation/schemas.ts    # Zod schemas for all domain entities
│   ├── services/
│   │   ├── ai/                      # Outreach Studio, Prompt Defense, Gemini/Mock LLMs
│   │   ├── crm/                     # Normalization, Deduplication, Safe CSV Exporter
│   │   ├── discovery/               # Multi-market provider adapters (Places, UK CH, Mock)
│   │   ├── email/                   # Compliance Guard, Resend & Safe Mock Email Dispatchers
│   │   ├── queue/                   # Durable Job Queue with workers, retries & dead-letter
│   │   ├── repository/              # Data Store (Supabase + In-Memory Fallback)
│   │   ├── scoring/                 # ICP Engine & Explainable scoring algorithm
│   │   └── website/                 # SSRF-protected DNS and HTTP website verifier
│   └── types/index.ts               # Core TypeScript domain entities and interfaces
├── supabase/
│   └── migrations/                  # 15 PostgreSQL relational schemas and RLS policies
├── .env.example                     # Environment configuration template
├── package.json
├── playwright.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## Quickstart & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the environment template:
```bash
cp .env.example .env.local
```
*(Note: GrowthSignal AI runs immediately out-of-the-box in sandbox mode with zero external credentials required. All discovery, scoring, website verification, AI drafting, and email dispatch operate via safe, deterministic local mock adapters.)*

### 3. Run Automated Tests
```bash
# Run Vitest test suite (37 unit & integration tests)
npm test

# Run strict TypeScript type check
npm run typecheck
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## External Credential Dependencies

When you are ready to connect live external APIs in production, configure the following keys in `.env.local`:

| Provider | Environment Variable | Purpose | Fallback when Unconfigured |
| :--- | :--- | :--- | :--- |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`<br/>`SUPABASE_SERVICE_ROLE_KEY` | Relational Postgres, RLS, audit logs | In-Memory / Local data repository |
| **Google Gemini** | `GEMINI_API_KEY` | Structured AI outreach generation | Grounded Deterministic Mock Engine |
| **Google Places** | `GOOGLE_PLACES_API_KEY` | Live local business discovery (US, CA, AU) | Licensed B2B Sandbox Adapter |
| **UK Companies House** | `COMPANIES_HOUSE_API_KEY` | Official UK statutory corporate search | Licensed B2B Sandbox Adapter |
| **Resend** | `RESEND_API_KEY` | Real email delivery | Safe Mock Dispatcher (In-Memory log) |
| **Redis** *(Optional)* | `REDIS_URL` | Distributed queue backend | Built-in durable transactional queue |
