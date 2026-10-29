import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { webhookVerifier, WebhookEventPayload } from '../webhook-verifier';
import { dataStore } from '../../repository/data-store';

describe('Webhook Signature Verification & Delivery Events', () => {
  const secret = 'whsec_test_secret_key_12345';

  it('validates authentic HMAC-SHA256 signature', () => {
    const rawPayload = JSON.stringify({ event: 'email.delivered' });
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawPayload);
    const validSignature = hmac.digest('hex');

    const isValid = webhookVerifier.verifySignature(rawPayload, validSignature, secret);
    expect(isValid).toBe(true);
  });

  it('rejects tampered payload or forged signature', () => {
    const rawPayload = JSON.stringify({ event: 'email.delivered' });
    const forgedSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const isValid = webhookVerifier.verifySignature(rawPayload, forgedSignature, secret);
    expect(isValid).toBe(false);
  });

  it('automatically adds hard bounced recipient to suppression list', async () => {
    const bounceEmail = 'bounced-contact@deadmailbox.org';
    const bounceEvent: WebhookEventPayload = {
      type: 'email.bounced',
      created_at: new Date().toISOString(),
      data: {
        to: [bounceEmail],
        bounce: {
          message: '550 5.1.1 User unknown',
          subType: 'HardBounce',
        },
      },
    };

    const result = await webhookVerifier.processEvent(bounceEvent);
    expect(result.processed).toBe(true);
    expect(result.actionTaken).toBe('suppressed_hard_bounce');

    // Verify it is now in dataStore suppression
    expect(dataStore.isSuppressed(bounceEmail)).toBe(true);
  });

  it('automatically adds spam complaint recipient to suppression list', async () => {
    const complaintEmail = 'complained-user@corporation.com';
    const complaintEvent: WebhookEventPayload = {
      type: 'email.complained',
      created_at: new Date().toISOString(),
      data: {
        to: [complaintEmail],
      },
    };

    const result = await webhookVerifier.processEvent(complaintEvent);
    expect(result.processed).toBe(true);
    expect(result.actionTaken).toBe('suppressed_spam_complaint');

    // Verify it is now in dataStore suppression
    expect(dataStore.isSuppressed(complaintEmail)).toBe(true);
  });
});

