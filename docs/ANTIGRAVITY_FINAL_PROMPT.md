# ANTIGRAVITY FINAL PROMPT: Fix + Upgrade Growth System Agent (based on a real code review)

Paste this whole file into Antigravity (Planning mode, strongest model). This REPLACES the earlier UX/fix prompts: you do not need to paste those separately.

Goal: a secure, honest system that finds REAL businesses worldwide that (a) have no website or only a social page, or (b) show verifiable business problems, then helps me pitch them like an expert, with every claim backed by evidence.

Rules for the whole job:
- No fake data. No invented claims in any pitch. Mock/demo data is always labeled DEMO and can never be sent.
- Work in the phases below, in order. After each phase run lint, typecheck, tests, build, show evidence, commit (never force-push), then continue.
- Do not claim anything is "working" unless you tested it against the running app (not only mocks). Say plainly what you could not verify.

---

## PHASE 0 - CRITICAL SECURITY BUGS (found in code review; fix first)

0.1 `src/middleware.ts` treats ANY value of cookie `growth_agent_session` or `sb-access-token` as logged in. Anyone can set a cookie called growth_agent_session=x and open the whole dashboard and all APIs.
Fix: validate the session cryptographically in middleware. Use a signed session (HMAC/JWT with SESSION_SECRET, expiry, issued-at) or verify the Supabase access token. Reject unsigned, expired or forged values. Use the Edge-compatible `jose` library or Web Crypto. Same check in `/api/auth/session` (it currently returns a hardcoded user for any cookie).

0.2 `src/app/api/auth/login/route.ts` has insecure fallbacks:
- "Master Passkey Mode" and "Local Session Mode" mint a predictable token like `operator_session_<time>_<base64 email>`.
- If Supabase and ADMIN_PASSWORD are not configured, anyone who types the admin email gets in with no password.
- The password is auto-synced into Supabase from the "master passkey".
Fix: remove all fallback/local session modes in production (NODE_ENV=production) and fail closed: if auth is not configured, login returns an error and nothing opens. Password is always required. Use constant-time compare. Add login rate limiting and lockout (e.g., 5 tries / 15 min per IP + email). Issue only signed sessions. Remove the pre-filled admin email on the login page.

0.3 `src/app/api/cron/scheduled-run/route.ts` falls back to a hardcoded secret `growth_system_cron_secret_key_2026` that is public in the GitHub repo, and accepts the secret in the URL query string. Anyone can trigger runs (and auto-send).
Fix: no default. If CRON_SECRET is unset, return 503. Accept only the `Authorization: Bearer` header, compare in constant time, and never log it. Tell me to rotate CRON_SECRET in Vercel and GitHub secrets.

0.4 `src/app/layout.tsx` renders Sidebar and Header for every route, including /login, so unauthenticated visitors see all nav links, my name and email, Export CSV and New Discovery Run. Fix: use route groups `(auth)` (login only, standalone layout, no sidebar/header/email) and `(dashboard)` (sidebar + header, protected). Login page must show a real form immediately (no endless "Loading portal session...").

0.5 Repo is public. Scan the whole git history for secrets (the hardcoded cron secret counts), list file names only (never print values), and give me the exact list of keys to rotate. Add `.env*` (except .env.example) to .gitignore and a pre-commit secret scan.

Gate: curl the running server: forged cookie -> 401/redirect; no cookie -> 401 on every /api route; cron without correct bearer -> 401; /login HTML contains no sidebar links and no email address. Add these as Playwright/Vitest tests that hit a real running server.

---

## PHASE 1 - REAL PERSISTENCE (the database is currently not used)

Finding: `SupabaseDataStore` exists but nothing imports it. The app runs entirely on the in-memory `dataStore` plus a local JSON file (`.data/...`). On Vercel the filesystem is ephemeral, so leads, drafts, suppressions and sent history are lost. README/REVIEW_NOTES claim "Supabase write-through", which is not true.
Fix:
- Make `IDataStore` the only interface; pick the Supabase implementation when configured. In production with no Supabase configured, refuse to run discovery/send and show a clear "Database not connected" state (no silent in-memory fallback in production).
- Replace hardcoded `organizationId: 'org-demo-001'`, `campaignId: 'camp-001-rag-expansion'` and `contactId: 'c_0'` placeholders with real ids from the logged-in user/org and real saved contacts.
- Replace the in-process `acquireLock` with a Postgres lock (table `locks` with expiry) so overlapping Vercel invocations cannot double-run or double-send.
- No demo seed data in production. In dev, demo data is labeled DEMO.
- Add integration tests against local Supabase: leads, drafts, suppression and sends survive restart; user B cannot read user A rows.
- Correct README/REVIEW_NOTES so they say only what is true.

---

## PHASE 2 - DISCOVERY ENGINE: FIND REAL BUSINESSES WITH NO WEBSITE OR WITH PROBLEMS (worldwide)

Current code (`google-places-provider.ts`, `automation-runner.ts`) does one text search of up to 20 results with no pagination, and the scheduled run is hardcoded to market US, industry "Software & Technology Services", limit 10. It cannot cover the world, and when keys are missing it falls back to mock data, which is why Run Now appears to do nothing (mock leads are skipped as duplicates).

Build:
2.1 **Search plan generator** (stored in DB): countries -> regions -> cities (seed list: top US metros, UK cities, Canada, Australia, NZ, UAE, Ireland, EU capitals, plus any city I add) x industries (editable list: dentists, clinics, plumbers, HVAC, electricians, roofers, restaurants, salons, gyms, lawyers, accountants, real estate, auto repair, cleaners, schools, etc.) -> query rows `(country, city, industry, status, next_page_token, last_run_at)`. Each run takes the next N unsearched/oldest rows, so coverage rotates across the world over days. Show coverage progress in the dashboard ("London dentists: done; Austin plumbers: page 2 of 3").
2.2 **Google Places API (New)** adapter upgrades: use `nextPageToken` pagination (up to the API limit), request fields: id, displayName, formattedAddress, websiteUri, nationalPhoneNumber, internationalPhoneNumber, googleMapsUri, rating, userRatingCount, businessStatus, regularOpeningHours, photos (count only), primaryType, types, and reviews (text of up to 5). Send the API key in the `X-Goog-Api-Key` header (already) and never log it. Add retry with backoff on 429/5xx, per-run and monthly cost caps (env `PLACES_MONTHLY_BUDGET`, count requests), and a "stop when budget reached" state. Check current Google Places pricing and show the estimated cost per run in the dashboard.
2.3 **No-website classification** (the main goal). For each place:
- `websiteUri` empty -> candidate "No website found".
- `websiteUri` is facebook/instagram/linktr.ee/yelp/etc. -> "Social page only".
- Otherwise run the existing SSRF-safe `verifyWebsite`: broken, parked, expired SSL, not mobile friendly -> "Website has problems" (with evidence).
- A failed request is never proof of no website. Before labeling "No website found", run one extra web search (Brave/SerpAPI/Bing adapter, optional) for the business name + city to look for an official site; if unsure, label "Website status unknown".
2.4 **Business-problem signals** (only from verified data, each stored with source and date): rating below 4.0 with many reviews, review text themes (LLM summary, no customer names) such as slow replies, hard to book, can't find prices/hours, missing opening hours, very few photos, unclaimed/incomplete profile, businessStatus problems, newly registered company (Companies House advanced search by incorporation date for the UK). Compute a "Business Opportunity Score" with a visible breakdown.
2.5 Companies House: add incorporated-in-last-90-days search and company status filters; paginate.
2.6 Remove silent fallback to `b2b_mock`: if the requested provider is not configured, the run stops with "Google Places key is missing". Mock provider only runs when I explicitly choose "Demo mode", and its records are labeled DEMO.
2.7 Dedupe globally by Google place id, normalized name + phone + address, and domain, including leads that already exist in the DB and ones already contacted.

---

## PHASE 3 - CONTACT STRATEGY FOR BUSINESSES WITHOUT A WEBSITE

Reality: a business with no website usually has no public email. The system must not rely on email only.
3.1 For each lead build a ranked "Best way to reach" list from verified sources only: (1) email if found on a legitimate source or licensed provider (Hunter/Apollo-style adapter, optional) AND verified (syntax + MX + verification API), (2) Google Maps / Business Profile link and phone (shown for manual use), (3) Facebook page, Instagram, LinkedIn, WhatsApp click-to-chat only if the business itself lists it. Profiles found through search are marked "Possible match (check before using)" unless the business's own pages link to them.
3.2 No auto-calling, no SMS, no automated DMs. Phone and social actions are manual buttons: Copy Pitch, Open Profile/Call link, Mark as Contacted, Set Reminder, Not Relevant. Show a reminder to check do-not-call/TPS rules before phoning.
3.3 Email is sent only to verified addresses with a documented source. UK sole traders/individuals are excluded by default (PECR/GDPR). Keep the unsubscribe flow, suppression list and sending window (use the recipient's real local time; fix the hardcoded `currentHour: 10` in the runner).

---

## PHASE 4 - EXPERT PITCH ENGINE (evidence-only)

Findings:
- `automation-runner.ts` writes channel pitches with unsupported claims ("noticed your commercial expansion", "impressed by your recent work"). Remove them. Every pitch must use only stored evidence.
- `gemini-provider.ts` hardcodes model `gemini-1.5-flash`, which is outdated and may no longer be available, and puts the API key in the URL query string.
Fix:
4.1 Model from env `GEMINI_MODEL` (I will set the current model name from Google AI Studio). API key via header `x-goog-api-key`. Timeouts, retries, and clear errors. Keep the mock provider only for tests/demo, labeled.
4.2 Pitch for "no website" leads uses real facts, e.g. "Your Google profile shows 4.8 stars from 212 reviews but no website link." Structure: one verified observation -> why it matters -> one concrete low-risk offer (e.g., a simple site with online booking in 10 days; price from MY offers table, I will fill in prices) -> one soft question. Never invent revenue, growth, hiring or problems.
4.3 Two-pass claim check: a second call verifies each factual sentence against stored evidence; unsupported sentences block the draft.
4.4 Platform pitches (Facebook/Instagram DM, LinkedIn note <= 300 chars, WhatsApp, call script of 5 lines, contact form) generated per lead from the same evidence, shown next to each channel with the evidence popover.
4.5 Mini-audit page for leads with an existing weak website (PageSpeed API, SSL, mobile checks), private signed link, optional in the email.
4.6 Follow-ups: max 2, spaced 4-7 days, stop on reply/unsubscribe/bounce.
4.7 Proof library and offers tables (I will enter real case studies and prices). If no relevant proof exists the pitch omits proof.

---

## PHASE 5 - RUN NOW, SCHEDULER AND SENDING

5.1 Run Now opens a form (country, city or "next in plan", industry, max leads, mode: find only / draft emails). It enqueues a DB job and returns immediately; the UI polls `/api/jobs/:id` and shows live steps: Searching -> Checking websites -> Finding contacts -> Scoring -> Writing drafts -> Done, with a plain-language summary. Missing provider key -> clear message with a link to Setup. Pause/Resume really stop and restart the queue.
5.2 Process in small batches that fit Vercel limits (set `maxDuration`; each invocation handles a few leads and re-enqueues). Idempotency keys on every send; uncertain sends are reconciled with the Gmail Sent label before any retry.
5.3 Scheduler: `vercel.json` only has one cron (`0 4 * * *`). Required: 04:00 and 12:00 UTC (09:00 and 17:00 Pakistan). Move `templates/workflows/scheduled-run.yml` to `.github/workflows/` (it is not active now), keep `0 4,12 * * *`, call the endpoint with the Bearer secret, and remove or fix the Vercel cron so runs are not duplicated. Remove the hardcoded fallback URL in the workflow.
5.4 Gmail: in-app OAuth connect button (already present: verify end to end), encrypted tokens, "Send test email to myself" and "Sync with Gmail" buttons. "Sent (confirmed)" appears only when Gmail returns messageId and the SENT label is verified. Sent Emails page must match the real Gmail Sent folder.
5.5 Default mode stays "Review first": nothing is sent without my approval until I enable auto-send after a confirmed test email.
5.6 Remove/disable the placement tester's fake behavior: real seed sends or "Not measured".
5.7 Deliverability: warm-up ramp, bounce auto-throttle, dedicated sending domain guide (SPF/DKIM/DMARC checker) and a visible emergency stop.

---

## PHASE 6 - DASHBOARD IN PLAIN LANGUAGE (anyone must understand it in 10 seconds)

- Orange "DEMO" badge and top banner on every demo record/page; demo records never show "Email Sent", a sent date or a Gmail link; "Show demo data" toggle (off when real providers are connected).
- Replace jargon: Dossier -> View Details; Pipeline A -> "Needs a Website"; Pipeline B -> "Needs AI / Software"; apparently_absent -> "No website found"; functional -> "Website works"; Approval Mode -> "Review first (safe)"; Controlled Auto-Send -> "Auto-send within safe limits"; Armed -> "Next automatic run: today 5:00 PM"; Sandbox/Mock -> "Test mode (not connected)". Scores get labels (Excellent/Good/Weak) with a one-line reason. Sidebar items get one-line descriptions. "?" help on each page (English + Roman Urdu).
- New Home "Today at a glance": Businesses found, Ready to contact, Emails sent (confirmed in Gmail), Replies, plus a "What should I do next?" checklist and plain-sentence activity timeline.
- Integrations page: each provider shows Green = connected (test passed), Yellow = test mode, Red = missing key, with a "Test connection" button. Mock providers must never show as "Active/Online". Supabase must not say "Active" when running on the in-memory fallback.
- Setup wizard: Supabase, Gmail connect, Google Places, Gemini, email verifier, test email.
- New pages: "No Website Found" (main list with map link, phone, rating, reviews, reasons, best way to reach, pitches), Search Plan/Coverage, Sent Emails (real proof), Lead Details.
- Friendly empty states everywhere.

---

## PHASE 7 - TESTS AND FINAL REPORT

- Unit tests for classifiers, scoring and pitch checks; integration tests with local Supabase; Playwright e2e on a running server: login, forged cookie rejected, Run Now flow, approve a draft, Sent Emails empty state, test-email flow (mocked Gmail in CI; one real test with my own account manually).
- Never send real campaign emails in tests.
- Final report: what is real vs demo, what is unit-tested vs integration-tested vs e2e-tested, commit hashes, the keys I must create or rotate (CRON_SECRET, SESSION_SECRET, ADMIN_PASSWORD, GOOGLE_PLACES_API_KEY, GEMINI_API_KEY, GEMINI_MODEL, Supabase keys, Google OAuth client with consent screen set to "In production"), and remaining blockers.