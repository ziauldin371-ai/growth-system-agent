import { describe, it, expect, beforeEach } from 'vitest';
import { emailService } from '../email-service';

describe('Email Service & Idempotency Key Tracking', () => {
  beforeEach(() => {
    emailService.mockProvider.clearLog();
    process.env.EMERGENCY_STOP = 'false';
  });

  it('dispatches email successfully when approved and within window', async () => {
    const result = await emailService.dispatchOutreachEmail({
      payload: {
        to: 'alex@docusync.com',
        subject: 'Custom AI Automation Proposal',
        body: 'Hello Alex, here is the proposal.',
        idempotencyKey: 'idemp-test-001',
      },
      isExplicitlyApproved: true,
      currentHour: 11,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('mock_delivered');

    const log = emailService.mockProvider.getSentLog();
    expect(log.length).toBe(1);
    expect(log[0].to).toBe('alex@docusync.com');
    expect(log[0].body).toContain('Physical Office:');
  });

  it('prevents duplicate sends using idempotency key', async () => {
    const payload = {
      to: 'alex@docusync.com',
      subject: 'Unique Proposal',
      body: 'Content',
      idempotencyKey: 'idemp-duplicate-check-002',
    };

    // First send
    const res1 = await emailService.dispatchOutreachEmail({
      payload,
      isExplicitlyApproved: true,
      currentHour: 11,
    });
    expect(res1.success).toBe(true);
    expect(res1.status).toBe('mock_delivered');

    // Duplicate send (e.g., worker restart, queue retry)
    const res2 = await emailService.dispatchOutreachEmail({
      payload,
      isExplicitlyApproved: true,
      currentHour: 11,
    });
    expect(res2.success).toBe(true);
    expect(res2.provider).toBe('idempotency_cache');
    expect(res2.error).toContain('Duplicate send intercepted');

    // Verified that underlying provider was only called once
    expect(emailService.mockProvider.getSentLog().length).toBe(1);
  });
});
