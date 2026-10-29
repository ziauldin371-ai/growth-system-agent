import { describe, it, expect } from 'vitest';
import { complianceGuard } from '../compliance-guard';

describe('Email Compliance & Approval Guard', () => {
  it('blocks dispatch when email has not received authenticated administrator approval', () => {
    const result = complianceGuard.verifySendEligibility({
      recipientEmail: 'client@example.com',
      isExplicitlyApproved: false, // Not approved
      currentHour: 11,
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('NOT_APPROVED');
    expect(result.reason).toContain('draft-only mode');
  });

  it('blocks dispatch when Emergency Stop is activated', () => {
    process.env.EMERGENCY_STOP = 'true';

    const result = complianceGuard.verifySendEligibility({
      recipientEmail: 'client@example.com',
      isExplicitlyApproved: true,
      currentHour: 11,
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('EMERGENCY_STOP');

    // Clean up
    process.env.EMERGENCY_STOP = 'false';
  });

  it('blocks recipient found on the suppression list', () => {
    const suppressedEmails = new Set(['unsubscribed@targetcorp.com']);
    const suppressedDomains = new Set(['competitor.com']);

    // Suppressed email
    const emailResult = complianceGuard.verifySendEligibility({
      recipientEmail: 'unsubscribed@targetcorp.com',
      isExplicitlyApproved: true,
      suppressedEmails,
      currentHour: 11,
    });
    expect(emailResult.allowed).toBe(false);
    expect(emailResult.code).toBe('SUPPRESSED');

    // Suppressed domain
    const domainResult = complianceGuard.verifySendEligibility({
      recipientEmail: 'ceo@competitor.com',
      isExplicitlyApproved: true,
      suppressedDomains,
      currentHour: 11,
    });
    expect(domainResult.allowed).toBe(false);
    expect(domainResult.code).toBe('SUPPRESSED');
  });

  it('blocks sending outside of designated sending window (09:00 - 17:00)', () => {
    // 03:00 AM
    const earlyMorning = complianceGuard.verifySendEligibility({
      recipientEmail: 'client@example.com',
      isExplicitlyApproved: true,
      sendingWindowStart: 9,
      sendingWindowEnd: 17,
      currentHour: 3,
    });
    expect(earlyMorning.allowed).toBe(false);
    expect(earlyMorning.code).toBe('OUTSIDE_SENDING_WINDOW');

    // 10:00 PM
    const lateNight = complianceGuard.verifySendEligibility({
      recipientEmail: 'client@example.com',
      isExplicitlyApproved: true,
      sendingWindowStart: 9,
      sendingWindowEnd: 17,
      currentHour: 22,
    });
    expect(lateNight.allowed).toBe(false);
    expect(lateNight.code).toBe('OUTSIDE_SENDING_WINDOW');
  });

  it('allows sending when approved, within sending window, and not suppressed', () => {
    const validSend = complianceGuard.verifySendEligibility({
      recipientEmail: 'client@example.com',
      isExplicitlyApproved: true,
      sendingWindowStart: 9,
      sendingWindowEnd: 17,
      currentHour: 14,
    });
    expect(validSend.allowed).toBe(true);
  });

  it('appends statutory compliance footer with unsubscribe link and physical address', () => {
    const rawBody = 'Hi Alex,\n\nI noticed your job opening for a Python Engineer.';
    const finalBody = complianceGuard.appendComplianceFooter(rawBody, 'alex@docusync.com');

    expect(finalBody).toContain('opt out immediately:');
    expect(finalBody).toContain('/api/compliance/unsubscribe?email=alex%40docusync.com');
    expect(finalBody).toContain('Physical Office:');
  });
});
