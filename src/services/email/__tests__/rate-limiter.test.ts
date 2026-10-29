import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimiter } from '../rate-limiter';

describe('Rate Limiter & Domain Velocity Throttling', () => {
  beforeEach(() => {
    rateLimiter.reset();
  });

  it('allows sends within normal thresholds', () => {
    const check = rateLimiter.checkRateLimit('ceo@targetcorp.com');
    expect(check.allowed).toBe(true);
  });

  it('throttles when domain velocity exceeds 3 emails per day to the same domain', () => {
    const email1 = 'cto@targetcorp.com';
    const email2 = 'ceo@targetcorp.com';
    const email3 = 'vp@targetcorp.com';
    const email4 = 'director@targetcorp.com';

    // Record 3 sends to targetcorp.com
    rateLimiter.recordSend(email1);
    rateLimiter.recordSend(email2);
    rateLimiter.recordSend(email3);

    // 4th send to same company domain should be throttled
    const check = rateLimiter.checkRateLimit(email4);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Domain velocity limit reached for "targetcorp.com"');

    // Different company domain is still allowed
    const diffDomainCheck = rateLimiter.checkRateLimit('founder@anothercompany.io');
    expect(diffDomainCheck.allowed).toBe(true);
  });

  it('throttles when custom or global daily cap is reached', () => {
    const cap = 2;
    rateLimiter.recordSend('user1@a.com');
    rateLimiter.recordSend('user2@b.com');

    const check = rateLimiter.checkRateLimit('user3@c.com', cap);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Daily sending limit reached (2/2 emails sent today)');
  });
});
