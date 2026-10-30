import { describe, it, expect } from 'vitest';
import { AIOutreachOutputSchema } from '@/lib/validation/schemas';
import { isPrivateOrReservedIp } from '../../website/ssrf-guard';
import { complianceGuard } from '../../email/compliance-guard';
import { emailService } from '../../email/email-service';
import { inMemoryDataStore as dataStore } from '../../repository/data-store';

describe('Security Boundaries & Threat Modeling', () => {
  it('rejects malformed AI structured responses missing required fields or having insufficient subject lines', () => {
    const invalidAiResponse = {
      researchSummary: 'Too short',
      observations: [], // Empty observations!
      rationale: 'Valid rationale goes here but missing other fields',
      valueProposition: 'Value proposition',
      subjectLines: ['Only one subject line'], // Needs 3!
      selectedSubject: 'Only one',
      emailBody: 'Short',
      callToAction: 'CTA',
      serviceOffer: 'Offer',
      confidenceRating: 0.9,
    };

    expect(() => AIOutreachOutputSchema.parse(invalidAiResponse)).toThrow();
  });

  it('blocks SSRF attempt targeting cloud instance metadata (AWS/GCP/Azure 169.254.169.254)', () => {
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:169.254.169.254')).toBe(true);
  });

  it('enforces immediate suppression when an unsubscribe event occurs', async () => {
    const testEmail = 'unsub-target-user@client-corp.com';
    const payload = {
      to: testEmail,
      subject: 'Outreach Test',
      body: 'Message content',
      idempotencyKey: 'idemp-unsub-test-01',
    };

    // Add to suppression store
    dataStore.addSuppression({
      id: 'sup-sec-01',
      organizationId: 'org-demo-001',
      type: 'email',
      value: testEmail,
      reason: 'unsubscribe',
      createdAt: new Date().toISOString(),
    });

    const suppressedList = new Set(dataStore.getSuppressionList().map(s => s.value.toLowerCase()));

    const sendRes = await emailService.dispatchOutreachEmail({
      payload,
      isExplicitlyApproved: true,
      suppressedEmails: suppressedList,
      currentHour: 11,
    });

    expect(sendRes.success).toBe(false);
    expect(sendRes.status).toBe('rejected_compliance');
    expect(sendRes.error).toContain('SUPPRESSED');
  });

  it('prevents accidental dispatch when emergency stop is triggered', async () => {
    process.env.EMERGENCY_STOP = 'true';

    const sendRes = await emailService.dispatchOutreachEmail({
      payload: {
        to: 'valid-recipient@company.com',
        subject: 'Subject',
        body: 'Body',
        idempotencyKey: 'idemp-emerg-test-01',
      },
      isExplicitlyApproved: true,
      currentHour: 11,
    });

    expect(sendRes.success).toBe(false);
    expect(sendRes.status).toBe('rejected_compliance');
    expect(sendRes.error).toContain('EMERGENCY_STOP');

    // Reset
    process.env.EMERGENCY_STOP = 'false';
  });
});
