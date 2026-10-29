import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComplianceGuard } from '../compliance-guard';

describe('Sandbox Guard (Real Gmail Provider Active Enforcement)', () => {
  let guard: ComplianceGuard;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    guard = new ComplianceGuard();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('blocks sending to a lead flagged with isSandboxData=true when real Gmail is active, even in development', () => {
    (process.env as any).NODE_ENV = 'development';

    const result = guard.verifySendEligibility({
      recipientEmail: 'realowner@activehvacservice.com',
      isExplicitlyApproved: true,
      isRealGmailActive: true,
      isSandboxData: true,
      sourceProvider: 'google_places',
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('COMPLIANCE_RESTRICTION');
    expect(result.reason).toContain('Sandbox Guard');
  });

  it('blocks synthetic and mock domains (.mock, .internal, @example.com) when real Gmail is active', () => {
    (process.env as any).NODE_ENV = 'development';

    const mockDomains = [
      'admin@vanguardhvac.mock',
      'contact@business.internal',
      'owner@example.com',
      'sales@targetcorp.com',
    ];

    for (const email of mockDomains) {
      const result = guard.verifySendEligibility({
        recipientEmail: email,
        isExplicitlyApproved: true,
        isRealGmailActive: true,
        sourceProvider: 'google_places',
      });

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('COMPLIANCE_RESTRICTION');
      expect(result.reason).toContain('Sandbox Guard');
    }
  });

  it('blocks leads originating from non-allowlisted sources when real Gmail is active', () => {
    (process.env as any).NODE_ENV = 'test';

    const result = guard.verifySendEligibility({
      recipientEmail: 'director@realcorporatefirm.co.uk',
      isExplicitlyApproved: true,
      isRealGmailActive: true,
      sourceProvider: 'unverified_scraper_mock',
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('COMPLIANCE_RESTRICTION');
    expect(result.reason).toContain('not in the verified live source allowlist');
  });

  it('permits dispatches to verified real-source leads with genuine domains when real Gmail is active', () => {
    (process.env as any).NODE_ENV = 'production';

    const result = guard.verifySendEligibility({
      recipientEmail: 'engineering@genuinefirm.com',
      isExplicitlyApproved: true,
      isRealGmailActive: true,
      isSandboxData: false,
      sourceProvider: 'google_places',
      currentHour: 10, // within business window
    });

    expect(result.allowed).toBe(true);
  });
});
