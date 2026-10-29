import { describe, it, expect } from 'vitest';
import { normalizeDomain, verifyWebsite } from '../verifier';

describe('Website Verifier & Domain Normalizer', () => {
  it('correctly normalizes domains and URLs', () => {
    expect(normalizeDomain('https://www.example.com/services?foo=bar')).toBe('example.com');
    expect(normalizeDomain('HTTP://AcmeCorp.co.uk/path/')).toBe('acmecorp.co.uk');
    expect(normalizeDomain('http://subdomain.test.org:8080/')).toBe('subdomain.test.org:8080');
    expect(normalizeDomain('')).toBeNull();
    expect(normalizeDomain(null)).toBeNull();
  });

  it('classifies business with no domain but social URLs as social_only', async () => {
    const result = await verifyWebsite({
      domain: null,
      socialUrls: ['https://facebook.com/bobsplumbing', 'https://instagram.com/bobsplumbing'],
      businessName: "Bob's Plumbing",
    });

    expect(result.status).toBe('social_only');
    expect(result.domain).toBeNull();
    expect(result.socialUrls?.length).toBe(2);
  });

  it('classifies business with direct social media link as social_only', async () => {
    const result = await verifyWebsite({
      domain: 'facebook.com/bobsplumbing',
      businessName: "Bob's Plumbing",
    });

    expect(result.status).toBe('social_only');
    expect(result.errorDetails).toContain('social/directory platform');
  });

  it('classifies business with no domain and no social links as apparently_absent', async () => {
    const result = await verifyWebsite({
      domain: null,
      socialUrls: [],
      businessName: 'Downtown Hardware',
    });

    expect(result.status).toBe('apparently_absent');
    expect(result.domain).toBeNull();
  });

  it('classifies non-existent / invalid TLD domain as apparently_absent due to NXDOMAIN', async () => {
    const result = await verifyWebsite({
      domain: 'this-domain-definitely-does-not-exist-20261030-xyz99.org',
      businessName: 'Unregistered Co',
    });

    expect(result.status).toBe('apparently_absent');
    expect(result.errorDetails).toMatch(/DNS lookup failed|no active DNS/);
  });
});
