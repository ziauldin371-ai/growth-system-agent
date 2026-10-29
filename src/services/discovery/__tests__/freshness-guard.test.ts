import { describe, it, expect, vi } from 'vitest';
import { enforceLeadFreshness } from '../freshness-guard';
import { BusinessEntity, WebsiteCheckEntity, ContactEntity } from '@/types';

vi.mock('../../website/verifier', () => ({
  verifyWebsite: vi.fn().mockResolvedValue({
    status: 'functional',
    httpStatusCode: 200,
    tlsValid: true,
    ipAddress: '104.21.5.12',
    isPrivateIp: false,
    redirectChain: ['https://example.com'],
    pageTitle: 'Example Inc',
    verificationLatencyMs: 120,
    errorDetails: null,
  }),
}));

describe('FreshnessGuard — 48-Hour Freshness & Eligibility Enforcement', () => {
  const baseBiz: BusinessEntity = {
    id: 'biz-fresh-1',
    organizationId: 'org-test',
    name: 'Bright Tech Dental',
    normalizedName: 'brighttechdental',
    domain: 'brighttechdental.co.uk',
    normalizedDomain: 'brighttechdental.co.uk',
    country: 'UK',
    pipelineType: 'website_opportunities',
    qualificationStatus: 'qualified',
    sourceProvider: 'google_places',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validContact: ContactEntity = {
    id: 'c-1',
    businessId: 'biz-fresh-1',
    fullName: 'Dr. Sarah Jenkins',
    email: 'contact@brighttechdental.co.uk',
    confidence: 0.9,
    verificationStatus: 'verified',
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('rejects permanently closed businesses immediately with 0 heat score', async () => {
    const closedBiz: BusinessEntity = {
      ...baseBiz,
      isPermanentlyClosed: true,
    };

    const res = await enforceLeadFreshness({
      business: closedBiz,
      contacts: [validContact],
    });

    expect(res.isEligibleForEmail).toBe(false);
    expect(res.rejectionReason).toContain('permanently or temporarily closed');
    expect(res.heatScore).toBe(0);
  });

  it('allows verified leads with recent check (< 48h) without re-running probe', async () => {
    const recentCheck: WebsiteCheckEntity = {
      id: 'wc-1',
      businessId: 'biz-fresh-1',
      domain: 'brighttechdental.co.uk',
      status: 'functional',
      isPrivateIp: false,
      checkedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    };

    const res = await enforceLeadFreshness({
      business: baseBiz,
      websiteCheck: recentCheck,
      contacts: [validContact],
      isNewRegistration: true,
    });

    expect(res.isEligibleForEmail).toBe(true);
    expect(res.reVerified).toBe(false);
    expect(res.heatScore).toBeGreaterThanOrEqual(70);
  });

  it('triggers automatic re-verification if last check is older than 48 hours', async () => {
    const staleCheck: WebsiteCheckEntity = {
      id: 'wc-stale',
      businessId: 'biz-fresh-1',
      domain: 'brighttechdental.co.uk',
      status: 'functional',
      isPrivateIp: false,
      checkedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 72 hours ago
    };

    const res = await enforceLeadFreshness({
      business: baseBiz,
      websiteCheck: staleCheck,
      contacts: [validContact],
    });

    expect(res.reVerified).toBe(true);
    expect(res.updatedWebsiteCheck).toBeDefined();
    expect(res.isEligibleForEmail).toBe(true);
  });
});
