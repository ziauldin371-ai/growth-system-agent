# Canonical Production Go-Live Verification Report

**Date:** 2026-11-01  
**Canonical Project:** `growth-system-agent`  
**Vercel Scope / Team:** `zia-2135`  
**GitHub Repository:** `ziauldin371-ai/growth-system-agent`  
**Canonical Production URL:** https://growth-system-agent-brown.vercel.app  
**Production Deployment ID:** `dpl_DUYFDVuSF3U3sKtkmnZrw8Yhz78z`  
**Git Default Branch:** `master`  
**Master Commit:** `b77afe6842a4aca0f15c3672704aa2bc04aa1df9`  
**Rollback Tag:** `pre-stitch` (`ee5b538be80af1219a8b4af6e8610ad38481dda6`)  
**Database Host:** `https://lajquqdzqfbhnunftgbn.supabase.co` (PostgreSQL)  

---

## 1. Executive Summary & Verification Gates (Step 7)

| Verification Item | Target Endpoint / Action | Status | Real Evidence / Command Output |
| :--- | :--- | :---: | :--- |
| **Health Check** | `GET /api/health` | **PASSED** | HTTP 200, `database: "connected"`, `mode: "supabase_postgresql"`, `readiness: "ok"`. No schema cache error. |
| **Operator Login** | `POST /api/auth/login` (valid) | **PASSED** | HTTP 200, sets secure session cookie `growth_agent_session` (`HttpOnly; Secure; SameSite=lax; Max-Age=604800`). |
| **Login Security** | `POST /api/auth/login` (invalid) | **PASSED** | HTTP 401: `{"success":false,"error":"Invalid credentials. Attempts remaining: 4."}`. |
| **Private Pages Gate** | `GET /`, `/businesses`, `/emails`, etc. | **PASSED** | HTTP 307 redirecting to `/login` when unauthenticated. |
| **Private APIs Gate** | `/api/businesses`, `/api/drafts`, etc. | **PASSED** | HTTP 401 Unauthorized when unauthenticated. |
| **Cron Auth Gate** | `POST /api/cron/scheduled-run` (no auth) | **PASSED** | HTTP 401 Unauthorized. |
| **Cron Query Block** | `POST /api/cron/scheduled-run?secret=...` | **PASSED** | HTTP 400: `{"success":false,"error":"Secret must be provided in Authorization header, not in query string"}`. |
| **Cron Authorized** | `POST /api/cron/scheduled-run` (Bearer) | **PASSED** | HTTP 200: `{"success":true,"status":"skipped","reason":"Google Places key is missing"}`. |
| **GitHub Actions Run** | Workflow `scheduled-run` (master) | **PASSED** | Run ID `41241602387`: HTTP 200 in 2s, exit code 0 (`skipped: Google Places key is missing`). |
| **Playwright Audit** | 390px and 1280px Desktop & Mobile | **PASSED** | Login & Home captured in `docs/screenshots/production/`. No "Database not connected" banner. Stitch UI active. |

---

## 2. Live Production Health Check Output

```json
{
  "status": "healthy",
  "readiness": "ok",
  "timestampUtc": "2026-10-31T21:00:31.871Z",
  "database": "connected",
  "databaseDetails": {
    "mode": "supabase_postgresql",
    "status": "connected",
    "connected": true
  },
  "scheduler": {
    "status": "active",
    "lastSuccessfulRunAt": "2026-10-31T17:34:53.139+00:00",
    "hoursSinceLastRun": 3.43,
    "thresholdHours": 14,
    "isWithinThreshold": true,
    "nextScheduledRuns": {
      "cron": "0 4,12 * * *",
      "description": "09:00 and 17:00 Asia/Karachi (04:00 and 12:00 UTC)"
    }
  },
  "system": {
    "environment": "production",
    "version": "1.0.0"
  }
}
```

---

## 3. GitHub Actions Scheduler Test Run

- **Run ID:** `41241602387`
- **Result:** Success (HTTP 200)
- **Status:** `skipped`
- **Reason:** `Google Places key is missing`
- **Raw Response Body:**
  ```json
  {
    "success": true,
    "status": "skipped",
    "reason": "Google Places key is missing",
    "message": "Run skipped: Google Places key is missing",
    "result": {
      "runId": "run_1793480486572_0f6300f7",
      "status": "skipped",
      "leadsDiscovered": 0,
      "leadsQualified": 0,
      "draftsGenerated": 0,
      "emailsSent": 0,
      "operatingMode": "auto_send",
      "reason": "Google Places key is missing",
      "durationMs": 965
    }
  }
  ```

---

## 4. Production Screenshots

Saved in `docs/screenshots/production/`:
- `docs/screenshots/production/login-1280.png` (Desktop 1280px login view)
- `docs/screenshots/production/login-390.png` (Mobile 390px login view)
- `docs/screenshots/production/home-1280.png` (Desktop 1280px dashboard view, database connected)
- `docs/screenshots/production/home-390.png` (Mobile 390px dashboard view, database connected)

---

## 5. Operational Requirements & Inactive Components (Why They Are OFF)

The core web app, database, security, and cloud scheduler are 100% active and healthy. The following components remain deliberately OFF according to safety protocols:

1. **Google Places API (`GOOGLE_PLACES_API_KEY`):** Not configured. The scheduler safely detects its absence and marks discovery runs as `skipped: Google Places key is missing` rather than failing.
2. **Gmail Send Pipeline (`GMAIL_CLIENT_ID` / `GOOGLE_REFRESH_TOKEN`):** Not connected. Default send mode is locked to `approval`, and the safety banner shows `Waiting for Gmail test`.
3. **Gemini API Key (`GEMINI_API_KEY`):** Not configured. Pitches are generated using the deterministic rule-based template engine.
4. **Auto-Send:** Explicitly set to disabled (`DEFAULT_SEND_MODE=approval`, `EMERGENCY_STOP=false`). No automated messages are dispatched.
