# Gmail API & Google OAuth2 Production Setup Guide

> **Operator**: Zia Ul Din (`ziauldin371@gmail.com`)  
> **Target Account**: `ziauldin371@gmail.com`  
> **Platform**: Growth System Agent  
> **Production URL**: `https://growth-system-agent-brown.vercel.app`

---

## Executive Summary

Growth System Agent delivers personalized cold outreach directly through the official Google Gmail REST API. This ensures:
1. Every sent message appears in your personal Gmail **Sent** folder.
2. Replies are detected through `gmail.readonly` sync.
3. High deliverability directly from your established email reputation.
4. Auto-send remains **OFF** by default until you verify a live test email sent to `ziauldin371@gmail.com`.

---

## Step 1: Create or Select Google Cloud Project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top navigation bar, click the project dropdown and click **New Project**.
3. Name the project: `growth-system-agent` (or choose an existing project).
4. Click **Create** and ensure the project is actively selected.

---

## Step 2: Enable the Gmail API

1. In the Google Cloud search bar, search for **Gmail API**.
2. Click on **Gmail API** from the Marketplace / API list.
3. Click the blue **Enable** button.
4. Wait a few seconds until the API status shows "API Enabled".

---

## Step 3: Configure OAuth Consent Screen (**CRITICAL STEP**)

> [!CAUTION]
> **Why Publishing Status MUST be "In production":**
> If your Google OAuth consent screen is left in **"Testing"** status, Google imposes a hard security limitation: **Refresh tokens expire after exactly 7 days**. When that happens, your automated scheduled runs will fail with `invalid_grant`. Setting status to **"In production"** makes refresh tokens permanent until revoked.

1. In the left navigation, go to **APIs & Services** > **OAuth consent screen**.
2. Under **User Type**, select **External** (available for standard `@gmail.com` accounts) and click **Create**.
3. **App Information**:
   - App name: `Growth System Agent`
   - User support email: `ziauldin371@gmail.com`
   - Developer contact email: `ziauldin371@gmail.com`
4. Click **Save and Continue**.
5. **Scopes**:
   - Click **Add or Remove Scopes**.
   - Search and select these three required scopes:
     - `https://www.googleapis.com/auth/gmail.send` (Send emails on your behalf)
     - `https://www.googleapis.com/auth/gmail.readonly` (Detect replies & bounces to stop follow-ups)
     - `https://www.googleapis.com/auth/userinfo.email` (Verify authenticated account)
   - Click **Update** then **Save and Continue**.
6. **Publishing Status**:
   - Return to the **OAuth consent screen** summary page.
   - Look for **Publishing status**.
   - Click **Publish App** and confirm the dialog.
   - Status must now show: **In production** (Verification status: Unverified is completely fine for personal use; you simply click "Advanced > Go to Growth System Agent (unsafe)" during first-time login).

---

## Step 4: Create OAuth 2.0 Credentials

1. In the left navigation, go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top > select **OAuth client ID**.
3. Under **Application type**, select **Web application**.
4. Name: `Growth System Web Client`.
5. Under **Authorized redirect URIs**, click **+ Add URI** and add BOTH:
   - **Production Callback**:
     ```
     https://growth-system-agent-brown.vercel.app/api/auth/gmail/callback
     ```
   - **Local Development Callback** (for local testing):
     ```
     http://localhost:3000/api/auth/gmail/callback
     ```
6. Click **Create**.
7. Google displays a popup containing:
   - **Client ID** (e.g., `xxxx.apps.googleusercontent.com`)
   - **Client Secret** (e.g., `GOCSPX-xxxx`)
8. Copy both values.

---

## Step 5: Add Credentials to Vercel & Local Environment

### In Vercel Project Settings:
1. Navigate to: `https://vercel.com/ziauldin371-ais-projects/growth-system-agent/settings/environment-variables`
2. Add the following environment variables (Target: Production & Preview):
   - `GOOGLE_CLIENT_ID` = `<your client ID>`
   - `GOOGLE_CLIENT_SECRET` = `<your client secret>`
   - `APP_BASE_URL` = `https://growth-system-agent-brown.vercel.app`

### In Local `.env.local`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
APP_BASE_URL=http://localhost:3000
```

---

## Step 6: Connect Gmail in the Dashboard

1. Log into your dashboard (`https://growth-system-agent-brown.vercel.app/setup` or `http://localhost:3000/setup`).
2. Navigate to the **Setup** page.
3. Next to **Gmail API Connection**, click **Connect Gmail**.
4. You will be redirected to Google's OAuth consent screen:
   - Log into `ziauldin371@gmail.com`.
   - If Google shows "Google hasn't verified this app", click **Advanced** > **Go to Growth System Agent (unsafe)**.
   - Check the boxes to allow sending and reading email.
   - Click **Continue**.
5. You will be redirected back to the dashboard with an encrypted refresh token safely stored in Supabase / durable token store.
6. The Gmail API status card will turn **Green**: `Connected (Gmail API)`.

---

## Step 7: Send Live Test Email (Mandatory Before Auto-Send)

1. On the **Setup** or **Emails** page, click the button: **Send test email to myself**.
2. The system sends a live probe email to `ziauldin371@gmail.com`.
3. Open your real Gmail inbox at [mail.google.com](https://mail.google.com):
   - Verify the test message arrived in your inbox.
   - Check your **Sent** folder to confirm the message was recorded there.
4. Return to the dashboard:
   - The amber banner `"Auto-send waiting for Gmail test"` will automatically resolve.
   - Controlled auto-sending is now authorized to operate during scheduled cloud cycles.
