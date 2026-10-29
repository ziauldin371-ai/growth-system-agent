import { describe, it, expect } from 'vitest';
import { GmailProvider } from '../providers/gmail-provider';

describe('Gmail API Provider & MIME Encoder', () => {
  const provider = new GmailProvider();

  it('declares official sender identity for Zia Ul Din', () => {
    expect(provider.senderEmail).toBe('ziauldin371@gmail.com');
    expect(provider.senderName).toBe('Zia Ul Din | AI & Automation Solutions');
    expect(provider.id).toBe('gmail');
  });

  it('returns unconfigured status when Google OAuth credentials are empty', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;

    expect(provider.isConfigured()).toBe(false);
  });

  it('returns an informative configuration error when send is attempted without credentials', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const result = await provider.send({
      to: 'lead@targetcorp.com',
      subject: 'Custom AI Automation Proposal',
      body: 'Hello team, here is the proposal.',
      idempotencyKey: 'idemp-gmail-test-01',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('Gmail API is unconfigured');
    expect(result.error).toContain('ziauldin371@gmail.com');
  });

  it('creates an RFC 2822 compliant base64url MIME message containing plain text and HTML', () => {
    const payload = {
      to: 'client@example.com',
      subject: 'AI Agent Architecture for Client',
      body: 'Hi Alex,\n\nWe would like to share our proposal.\n\nBest regards,\nZia',
      idempotencyKey: 'idemp-mime-test-02',
      metadata: {
        htmlBody: '<p>Hi Alex,</p><p>We would like to share our proposal.</p>',
      },
    };

    const encoded = provider.createMimeMessage(payload);
    expect(encoded).toBeDefined();
    expect(typeof encoded).toBe('string');
    // base64url characters only
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

    // Decode and inspect content
    const decoded = Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    expect(decoded).toContain('From: Zia Ul Din | AI & Automation Solutions <ziauldin371@gmail.com>');
    expect(decoded).toContain('To: client@example.com');
    expect(decoded).toContain('Content-Type: multipart/alternative');
    expect(decoded).toContain('Content-Type: text/plain; charset=utf-8');
    expect(decoded).toContain('Content-Type: text/html; charset=utf-8');
    expect(decoded).toContain('Hi Alex,');
  });
});

