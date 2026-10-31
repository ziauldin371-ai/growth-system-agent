import { describe, it, expect, beforeEach } from 'vitest';
import { autoSendGuard } from '../auto-send-guard';
import { dataStore } from '../../repository/data-store';
import { EmailDraftEntity, BusinessEntity, ContactEntity } from '@/types';

describe('AutoSendGuard Comprehensive Safeguard Engine', () => {
  const validBusiness: BusinessEntity = {
    id: 'biz-01',
    organizationId: 'org-01',
    name: 'Apex Precision Engineering Ltd',
    normalizedName: 'apex precision engineering ltd',
    domain: 'apex-precision-uk.co.uk',
    normalizedDomain: 'apex-precision-uk.co.uk',
    country: 'UK',
    region: 'London',
    city: 'London',
    companyType: 'Private Limited Company',
    pipelineType: 'website_opportunities' as const,
    qualificationStatus: 'qualified' as const,
    sourceProvider: 'companies_house',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validContact: ContactEntity = {
    id: 'c-01',
    businessId: 'biz-01',
    fullName: 'David Sterling',
    email: 'david.sterling@apex-precision-uk.co.uk',
    normalizedEmail: 'david.sterling@apex-precision-uk.co.uk',
    verificationStatus: 'verified' as const,
    confidence: 0.95,
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validDraft: EmailDraftEntity = {
    id: 'draft-01',
    businessId: 'biz-01',
    contactId: 'c-01',
    campaignId: 'camp-01',
    strategy: 'web_development',
    subjectLines: [
      'Digital modern portal for Apex Precision Engineering',
      'High-converting web platform for Apex Precision',
      'Modern client intake portal for Apex Engineering',
    ],
    selectedSubject: 'Digital modern portal for Apex Precision Engineering',
    emailBody: `Hi David,

Noticed Apex Precision Engineering's recent expansion in London. Many specialist engineering firms rely on word-of-mouth, but lack a responsive modern portal for high-value commercial tenders.

As a Full Stack AI Developer & Automation Architect, I build high-converting web applications with automated client intake pipelines.

Would you be open to a brief 5-minute conversation next Tuesday? If you would prefer not to hear from me, just reply unsubscribe.

Best regards,
Zia Ul Din`,
    callToAction: 'Reply for a 5-minute exchange',
    serviceOffer: 'Modern tender intake platform',
    researchSummary: 'Active precision firm in London',
    observations: [
      { fact: 'Expanding in London', source: 'Companies House', isVerified: true },
      { fact: 'No official responsive site', source: 'Website audit', isVerified: true },
    ],
    rationale: 'Direct outreach for high-value engineering portal',
    warnings: [],
    confidenceRating: 0.95,
    version: 1,
    qualityGatePassed: true,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validEvidence = [
    {
      id: 'ev-01',
      businessId: 'biz-01',
      sourceName: 'UK Companies House',
      sourceUrl: 'https://companieshouse.gov.uk/12345',
      observationTime: new Date().toISOString(),
      evidenceType: 'registration',
      summary: 'Noticed Apex Precision Engineering expansion in London.',
      isFactual: true,
      confidence: 1.0,
      freshnessScore: 1.0,
      createdAt: new Date().toISOString(),
    },
  ];

  // A Tuesday at 14:00 UTC (14:00 London time)
  const tuesdayAfternoon = new Date('2026-10-27T14:00:00Z');

  beforeEach(() => {
    if (validContact.email) {
      (dataStore as any).suppression?.delete(validContact.email.toLowerCase());
    }
    if (validBusiness.domain) {
      (dataStore as any).suppression?.delete(validBusiness.domain.toLowerCase());
    }
  });

  it('approves fully eligible lead with real local time inside window', async () => {
    const result = await autoSendGuard.evaluateAutoSendEligibility({
      business: validBusiness,
      contact: validContact,
      draft: validDraft,
      evidence: validEvidence,
      websiteCheckedAt: new Date(tuesdayAfternoon.getTime() - 2 * 3600 * 1000).toISOString(),
      currentDateOverride: tuesdayAfternoon,
      skipTestEmailCheckForTesting: true,
    });

    expect(result.eligibleForAutoSend).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('blocks unverified or catch-all email', async () => {
    const unverifiedContact = { ...validContact, verificationStatus: 'catch_all' as any };
    const result = await autoSendGuard.evaluateAutoSendEligibility({
      business: validBusiness,
      contact: unverifiedContact,
      draft: validDraft,
      evidence: validEvidence,
      currentDateOverride: tuesdayAfternoon,
      skipTestEmailCheckForTesting: true,
    });

    expect(result.eligibleForAutoSend).toBe(false);
    expect(result.checks.emailVerified).toBe(false);
    expect(result.primaryBlockReason).toContain('Catch-all');
  });

  it('blocks UK sole traders and unincorporated individuals under PECR rule', async () => {
    const soleTraderBiz = { ...validBusiness, companyType: 'Sole Trader / Independent Contractor' };
    const result = await autoSendGuard.evaluateAutoSendEligibility({
      business: soleTraderBiz,
      contact: validContact,
      draft: validDraft,
      evidence: validEvidence,
      currentDateOverride: tuesdayAfternoon,
      skipTestEmailCheckForTesting: true,
    });

    expect(result.eligibleForAutoSend).toBe(false);
    expect(result.checks.ukSoleTraderExcluded).toBe(false);
    expect(result.primaryBlockReason).toContain('UK sole traders');
  });

  it('blocks when data check is older than 48 hours', async () => {
    const oldCheckDate = new Date(tuesdayAfternoon.getTime() - 55 * 3600 * 1000).toISOString(); // 55 hours ago
    const result = await autoSendGuard.evaluateAutoSendEligibility({
      business: validBusiness,
      contact: validContact,
      draft: validDraft,
      evidence: validEvidence,
      websiteCheckedAt: oldCheckDate,
      currentDateOverride: tuesdayAfternoon,
      skipTestEmailCheckForTesting: true,
    });

    expect(result.eligibleForAutoSend).toBe(false);
    expect(result.checks.businessActiveAndFresh).toBe(false);
    expect(result.primaryBlockReason).toContain('48-hour freshness rule');
  });

  it('blocks when recipient local time is outside business hours', async () => {
    // 03:00 London time (night)
    const nightTime = new Date('2026-10-27T03:00:00Z');
    const result = await autoSendGuard.evaluateAutoSendEligibility({
      business: validBusiness,
      contact: validContact,
      draft: validDraft,
      evidence: validEvidence,
      currentDateOverride: nightTime,
      skipTestEmailCheckForTesting: true,
    });

    expect(result.eligibleForAutoSend).toBe(false);
    expect(result.checks.recipientLocalTimeInsideWindow).toBe(false);
    expect(result.primaryBlockReason).toContain('outside 9:00-17:00 business hours');
  });

  it('blocks synthetic DEMO and sandbox data', async () => {
    const demoBiz = { ...validBusiness, sourceProvider: 'b2b_mock' };
    const result = await autoSendGuard.evaluateAutoSendEligibility({
      business: demoBiz,
      contact: validContact,
      draft: validDraft,
      evidence: validEvidence,
      currentDateOverride: tuesdayAfternoon,
      skipTestEmailCheckForTesting: true,
    });

    expect(result.eligibleForAutoSend).toBe(false);
    expect(result.checks.notSandboxData).toBe(false);
    expect(result.primaryBlockReason).toContain('Sandbox / DEMO lead');
  });

  it('blocks when recipient email is on global suppression list', async () => {
    await dataStore.addSuppression({
      id: 'supp-01',
      organizationId: 'org-01',
      type: 'email',
      value: validContact.email!,
      reason: 'unsubscribe',
      createdAt: new Date().toISOString(),
    });

    const result = await autoSendGuard.evaluateAutoSendEligibility({
      business: validBusiness,
      contact: validContact,
      draft: validDraft,
      evidence: validEvidence,
      currentDateOverride: tuesdayAfternoon,
      skipTestEmailCheckForTesting: true,
    });

    expect(result.eligibleForAutoSend).toBe(false);
    expect(result.checks.notSuppressed).toBe(false);
    expect(result.primaryBlockReason).toContain('suppression');
  });
});
