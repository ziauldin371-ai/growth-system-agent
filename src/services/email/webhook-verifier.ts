import crypto from 'crypto';
import { dataStore } from '../repository/data-store';

export interface WebhookEventPayload {
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.complained' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to: string[];
    subject?: string;
    campaign_id?: string;
    draft_id?: string;
    bounce?: {
      message?: string;
      subType?: string;
    };
  };
}

export class WebhookVerifier {
  /**
   * Verifies standard HMAC-SHA256 webhook signatures (used by Resend / Svix / SendGrid).
   */
  public verifySignature(
    payloadRaw: string,
    signatureHeader: string | null,
    secret: string
  ): boolean {
    if (!signatureHeader || !secret) {
      return false;
    }

    try {
      // Signature header format: "t=123456,v1=abcdef..." or raw hex hmac
      let expectedHash = signatureHeader;
      let timestamp = '';

      if (signatureHeader.includes('v1=')) {
        const parts = signatureHeader.split(',');
        for (const part of parts) {
          if (part.startsWith('t=')) timestamp = part.replace('t=', '');
          if (part.startsWith('v1=')) expectedHash = part.replace('v1=', '');
        }
      }

      const signedContent = timestamp ? `${timestamp}.${payloadRaw}` : payloadRaw;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(signedContent);
      const computedHash = hmac.digest('hex');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(expectedHash, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Processes a verified delivery telemetry event.
   * Hard bounces and spam complaints automatically populate the suppression list.
   */
  public async processEvent(event: WebhookEventPayload): Promise<{
    processed: boolean;
    actionTaken?: string;
  }> {
    const recipient = event.data.to?.[0];
    if (!recipient) {
      return { processed: false, actionTaken: 'missing_recipient' };
    }

    const cleanEmail = recipient.toLowerCase().trim();

    switch (event.type) {
      case 'email.bounced':
        dataStore.addSuppression({
          id: `sup_bounce_${crypto.randomBytes(6).toString('hex')}`,
          organizationId: 'org-demo-001',
          type: 'email',
          value: cleanEmail,
          reason: 'hard_bounce',
          notes: `Automatic bounce suppression: ${event.data.bounce?.message || 'Mailbox delivery failed permanently'}`,
          createdAt: new Date().toISOString(),
        });
        return { processed: true, actionTaken: 'suppressed_hard_bounce' };

      case 'email.complained':
        dataStore.addSuppression({
          id: `sup_complaint_${crypto.randomBytes(6).toString('hex')}`,
          organizationId: 'org-demo-001',
          type: 'email',
          value: cleanEmail,
          reason: 'complaint',
          notes: 'Recipient reported message as spam complaint.',
          createdAt: new Date().toISOString(),
        });
        return { processed: true, actionTaken: 'suppressed_spam_complaint' };

      case 'email.delivered':
        return { processed: true, actionTaken: 'recorded_delivery' };

      default:
        return { processed: true, actionTaken: 'recorded_telemetry' };
    }
  }
}

export const webhookVerifier = new WebhookVerifier();
