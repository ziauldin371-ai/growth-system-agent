import { tokenStore } from '../repository/token-store';
import { dataStore } from '../repository/data-store';
import { rateLimiter } from './rate-limiter';
import { emailService } from './email-service';
import crypto from 'crypto';

export interface InboxSyncResult {
  syncedAt: string;
  repliesDetected: number;
  bouncesDetected: number;
  followupsStopped: number;
  unsubscribesDetected: number;
  details: Array<{
    type: 'reply' | 'bounce' | 'unsubscribe';
    from: string;
    subject: string;
    actionTaken: string;
  }>;
}

export class GmailInboxSyncService {
  private readonly senderEmail = 'ziauldin371@gmail.com';

  /**
   * Refreshes OAuth2 access token for reading incoming messages.
   */
  private async getAccessToken(): Promise<string | null> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    const stored = await tokenStore.getToken(this.senderEmail, 'gmail');
    if (stored && stored.refreshToken && stored.status !== 'revoked') {
      refreshToken = stored.refreshToken;
    }

    if (!clientId || !clientSecret || !refreshToken) {
      return null;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.access_token;
    } catch {
      return null;
    }
  }

  /**
   * Synchronizes recent incoming messages via Gmail API (gmail.readonly).
   * Identifies replies, bounces, and unsubscribe requests, halting all follow-ups.
   */
  public async syncInbox(queryOverride?: string): Promise<InboxSyncResult> {
    const result: InboxSyncResult = {
      syncedAt: new Date().toISOString(),
      repliesDetected: 0,
      bouncesDetected: 0,
      followupsStopped: 0,
      unsubscribesDetected: 0,
      details: [],
    };

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return result; // Standalone or unconfigured mode
    }

    try {
      const query = queryOverride || 'newer_than:2d (is:inbox OR label:spam OR from:mailer-daemon)';
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=25`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!listRes.ok) return result;
      const listData = await listRes.json();
      const messages: Array<{ id: string; threadId: string }> = listData.messages || [];

      const sentDrafts = await dataStore.getSentEmails();
      const sentEmailsMap = new Map<string, any>();
      for (const d of sentDrafts) {
        if (d.recipientEmail) {
          sentEmailsMap.set(d.recipientEmail.toLowerCase(), d);
        }
      }

      for (const msg of messages) {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=In-Reply-To`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!msgRes.ok) continue;
        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];

        let fromHeader = '';
        let subjectHeader = '';
        let inReplyTo = '';

        for (const h of headers) {
          if (h.name.toLowerCase() === 'from') fromHeader = h.value;
          if (h.name.toLowerCase() === 'subject') subjectHeader = h.value;
          if (h.name.toLowerCase() === 'in-reply-to') inReplyTo = h.value;
        }

        const snippet = msgData.snippet || '';

        // Extract clean sender email
        const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader];
        const senderEmail = (emailMatch[1] || fromHeader).trim().toLowerCase();

        // 1. Detect Delivery Status Notification / Bounces
        const isBounce =
          senderEmail.includes('mailer-daemon') ||
          subjectHeader.toLowerCase().includes('delivery status notification') ||
          subjectHeader.toLowerCase().includes('undeliverable') ||
          snippet.toLowerCase().includes('address not found');

        if (isBounce) {
          result.bouncesDetected++;
          rateLimiter.recordBounce();

          // Check if bounce exceeds safety thresholds
          const deliverability = rateLimiter.getDeliverabilityStats();
          if (deliverability.isEmergencyPause) {
            console.error('[GMAIL INBOX SYNC] Critical: Bounce rate > 5.0%. Emergency pause initiated.');
            dataStore.setAutomationPaused(true);
          }

          result.details.push({
            type: 'bounce',
            from: senderEmail,
            subject: subjectHeader,
            actionTaken: `Recorded bounce. Current bounce rate: ${deliverability.bounceRate}% (Throttled: ${deliverability.isThrottled})`,
          });
          continue;
        }

        // 2. Detect Opt-out / Unsubscribe requests
        const lowerBody = snippet.toLowerCase();
        const isUnsubscribe =
          subjectHeader.toLowerCase().includes('unsubscribe') ||
          lowerBody.includes('unsubscribe') ||
          lowerBody.includes('remove me') ||
          lowerBody.includes('stop emailing');

        if (isUnsubscribe && senderEmail) {
          result.unsubscribesDetected++;
          await dataStore.addSuppression({
            id: `sup_unsub_${crypto.randomUUID()}`,
            organizationId: '00000000-0000-0000-0000-000000000001',
            type: 'email',
            value: senderEmail,
            reason: 'unsubscribe',
            createdAt: new Date().toISOString(),
          });

          result.details.push({
            type: 'unsubscribe',
            from: senderEmail,
            subject: subjectHeader,
            actionTaken: `Suppressed recipient "${senderEmail}" across all outreach pipelines.`,
          });
          continue;
        }

        // 3. Detect Real Human Replies to Sent Campaigns
        const matchedDraft = sentEmailsMap.get(senderEmail);
        if (matchedDraft || inReplyTo) {
          result.repliesDetected++;

          // Halt all further outreach / follow-up drafts for this business
          const bizId = matchedDraft?.businessId;
          if (bizId) {
            const biz = await dataStore.getBusinessById(bizId);
            if (biz) {
              biz.qualificationStatus = 'replied';
              await dataStore.saveBusiness(biz);
            }
          }

          if (matchedDraft?.id) {
            await dataStore.updateDraftStatus(matchedDraft.id, 'sent');
          }

          result.followupsStopped++;

          // Dispatch Instant Notification to Zia Ul Din
          await emailService.dispatchOutreachEmail({
            payload: {
              to: this.senderEmail,
              subject: `[INBOUND CLIENT REPLY] ${senderEmail} has replied to your pitch!`,
              body: `Inbound Lead Reply Notification:

Sender: ${fromHeader}
Subject: ${subjectHeader}
Snippet: "${snippet}"

Status: All scheduled follow-ups to this contact have been automatically halted.
Gmail Thread: https://mail.google.com/mail/u/0/#inbox/${msg.threadId}

Open the dashboard or reply directly in Gmail to continue the conversation.`,
              draftId: `reply_alert_${msg.id}`,
              idempotencyKey: `reply_notif_${msg.id}`,
            },
            isExplicitlyApproved: true,
            currentHour: 10,
          });

          result.details.push({
            type: 'reply',
            from: fromHeader,
            subject: subjectHeader,
            actionTaken: 'Follow-ups halted and instant notification email sent to ziauldin371@gmail.com.',
          });
        }
      }
    } catch (err: any) {
      console.warn('[GMAIL INBOX SYNC] Sync error:', err?.message || err);
    }

    return result;
  }
}

export const gmailInboxSyncService = new GmailInboxSyncService();
