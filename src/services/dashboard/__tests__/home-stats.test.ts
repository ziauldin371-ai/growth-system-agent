import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { DataStore } from '@/services/repository/data-store';
import { computeHomeStats, isDemoOrSandboxRecord, isRealVerifiedSentEmail } from '@/services/repository/demo-guard';
import { BusinessEntity, EmailDraftEntity } from '@/types';

describe('Home Dashboard Real Metrics & Demo Data Isolation', () => {
  let store: DataStore;
  let tempPath: string;

  beforeEach(() => {
    tempPath = path.join(os.tmpdir(), `test_home_store_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
    store = new DataStore(tempPath);
    store.clearDemoData();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
  });

  it('with only demo data in the store, Home shows all zeros and timeline says "Nothing yet. Start by connecting your services."', async () => {
    // Populate demo data
    store.seedDemoData();
    expect(store.hasDemoData()).toBe(true);

    const businesses = store.getBusinesses({ includeDemo: false }).businesses;
    const drafts = store.getDrafts({ includeDemo: false });

    // Default: includeDemo is false
    expect(businesses).toHaveLength(0);
    expect(drafts).toHaveLength(0);

    const stats = store.getPlatformStats();
    expect(stats.totalBusinesses).toBe(0);
    expect(stats.qualifiedTotal).toBe(0);
    expect(stats.eligibleEmailContacts).toBe(0);
    expect(stats.sentCount).toBe(0);
    expect(stats.confirmedDeliveries).toBe(0);
    expect(stats.repliesCount).toBe(0);
    expect(stats.alternativeChannelsCount).toBe(0);
    expect(stats.noEmailCount).toBe(0);
    expect(stats.timelineSentences).toEqual(['Nothing yet. Start by connecting your services.']);
  });

  it('with one real send record, "Emails sent" is 1', async () => {
    const realBiz: BusinessEntity = {
      id: 'biz_real_plumbing_austin',
      organizationId: 'org_live_001',
      name: 'Austin Master Plumbers',
      normalizedName: 'austin master plumbers',
      domain: 'austinmasterplumbers.com',
      normalizedDomain: 'austinmasterplumbers.com',
      country: 'US',
      city: 'Austin',
      industry: 'Plumbing',
      pipelineType: 'website_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'google_places',
      isSandboxData: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.saveBusiness(realBiz);

    const realSentDraft: EmailDraftEntity = {
      id: 'draft_real_001',
      businessId: realBiz.id,
      strategy: 'web_development',
      subjectLines: [
        'Custom quote intake portal for Austin Master Plumbers',
        'Website overhaul for Austin Master Plumbers',
        'Automated booking intake for Austin Master Plumbers',
      ],
      selectedSubject: 'Custom quote intake portal for Austin Master Plumbers',
      emailBody: 'Hi David, noticed your great Google reviews in Austin...',
      callToAction: 'Would you be open to a 10-minute chat?',
      serviceOffer: 'Custom booking portal',
      researchSummary: 'Verified local plumbing business',
      observations: [{ fact: '4.9 rating on Google Places', source: 'Google', isVerified: true }],
      rationale: 'High local volume',
      warnings: [],
      confidenceRating: 0.95,
      version: 1,
      status: 'sent',
      deliveryStatus: 'delivered',
      gmailMessageId: '18f294ab87cd6e5f', // Real Gmail message ID
      gmailConfirmed: true,
      gmailLabels: ['SENT', 'INBOX'],
      recipientEmail: 'contact@austinmasterplumbers.com',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.saveDraft(realSentDraft);

    // Verify using isRealVerifiedSentEmail helper directly
    expect(isRealVerifiedSentEmail(realSentDraft, true)).toBe(true);

    const homeStats = computeHomeStats({
      businesses: [realBiz],
      drafts: [realSentDraft],
      isGmailConnected: true,
      showDemo: false,
    });

    expect(homeStats.totalBusinesses).toBe(1);
    expect(homeStats.sentCount).toBe(1);
    expect(homeStats.confirmedDeliveries).toBe(1);
  });

  it('with a send record lacking messageId, it is 0', async () => {
    const realBiz: BusinessEntity = {
      id: 'biz_real_dentist_london',
      organizationId: 'org_live_001',
      name: 'Soho Dental Practice',
      normalizedName: 'soho dental practice',
      domain: 'sohodental.co.uk',
      normalizedDomain: 'sohodental.co.uk',
      country: 'UK',
      city: 'London',
      industry: 'Healthcare',
      pipelineType: 'website_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'google_places',
      isSandboxData: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.saveBusiness(realBiz);

    const draftLackingMessageId: EmailDraftEntity = {
      id: 'draft_no_msg_id',
      businessId: realBiz.id,
      strategy: 'web_development',
      subjectLines: [
        'Modern patient intake portal',
        'Website update for Soho Dental Practice',
        'Online booking system for patient appointments',
      ],
      selectedSubject: 'Modern patient intake portal',
      emailBody: 'Hi Dr. Smith...',
      callToAction: 'Brief chat?',
      serviceOffer: 'Web booking',
      researchSummary: 'Dental clinic',
      observations: [],
      rationale: 'Local demand',
      warnings: [],
      confidenceRating: 0.9,
      version: 1,
      status: 'sent',
      deliveryStatus: 'delivered',
      gmailMessageId: null, // Lacking Gmail messageId!
      gmailConfirmed: false,
      recipientEmail: 'info@sohodental.co.uk',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.saveDraft(draftLackingMessageId);

    expect(isRealVerifiedSentEmail(draftLackingMessageId, true)).toBe(false);

    const homeStats = computeHomeStats({
      businesses: [realBiz],
      drafts: [draftLackingMessageId],
      isGmailConnected: true,
      showDemo: false,
    });

    expect(homeStats.sentCount).toBe(0);
    expect(homeStats.confirmedDeliveries).toBe(0);
  });

  it('manual-outreach count must be a subset of the businesses found; no card can exceed the businesses total', () => {
    // Generate 12 real businesses with various statuses
    const mockBusinesses: BusinessEntity[] = Array.from({ length: 12 }, (_, i) => ({
      id: `biz_real_${i}`,
      organizationId: 'org_live_001',
      name: `Real Business ${i}`,
      normalizedName: `real business ${i}`,
      domain: i % 3 === 0 ? null : `biz${i}.com`, // 4 have no website -> manual outreach
      normalizedDomain: i % 3 === 0 ? null : `biz${i}.com`,
      country: 'US',
      city: 'Dallas',
      industry: 'Commercial Services',
      pipelineType: 'website_opportunities',
      qualificationStatus: i % 2 === 0 ? 'qualified' : 'disqualified', // 6 qualified
      sourceProvider: 'google_places',
      isSandboxData: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const mockDrafts: EmailDraftEntity[] = [
      {
        id: 'draft_1',
        businessId: 'biz_real_1',
        strategy: 'web_development',
        subjectLines: ['Hello', 'Subject 2', 'Subject 3'],
        selectedSubject: 'Hello',
        emailBody: 'Body',
        callToAction: 'Chat?',
        serviceOffer: 'Offer',
        researchSummary: 'Summary',
        observations: [],
        rationale: 'Rationale',
        warnings: [],
        confidenceRating: 0.9,
        version: 1,
        status: 'sent',
        deliveryStatus: 'delivered',
        gmailMessageId: 'msg_valid_123',
        gmailConfirmed: true,
        recipientEmail: 'lead@biz1.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const stats = computeHomeStats({
      businesses: mockBusinesses,
      drafts: mockDrafts,
      isGmailConnected: true,
      showDemo: false,
    });

    // Subsets must never exceed the businesses total
    expect(stats.totalBusinesses).toBe(12);
    expect(stats.manualOutreachCount).toBe(4);
    expect(stats.manualOutreachCount).toBeLessThanOrEqual(stats.totalBusinesses);

    expect(stats.qualifiedTotal).toBe(6);
    expect(stats.qualifiedTotal).toBeLessThanOrEqual(stats.totalBusinesses);

    expect(stats.eligibleEmailContacts).toBeLessThanOrEqual(stats.totalBusinesses);
    expect(stats.sentCount).toBeLessThanOrEqual(stats.totalBusinesses);
    expect(stats.repliesCount).toBeLessThanOrEqual(stats.totalBusinesses);
  });

  it('if Gmail is not connected, Emails sent shows 0', () => {
    const realBiz: BusinessEntity = {
      id: 'biz_1',
      organizationId: 'org_live_001',
      name: 'Real Shop',
      normalizedName: 'real shop',
      domain: 'realshop.com',
      normalizedDomain: 'realshop.com',
      country: 'US',
      city: 'Miami',
      industry: 'Retail',
      pipelineType: 'website_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'google_places',
      isSandboxData: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const draftWithMsgId: EmailDraftEntity = {
      id: 'draft_gmail_offline',
      businessId: 'biz_1',
      strategy: 'web_development',
      subjectLines: ['Intro', 'Option 2', 'Option 3'],
      selectedSubject: 'Intro',
      emailBody: 'Body',
      callToAction: 'Chat?',
      serviceOffer: 'Offer',
      researchSummary: 'Summary',
      observations: [],
      rationale: 'Rationale',
      warnings: [],
      confidenceRating: 0.9,
      version: 1,
      status: 'sent',
      deliveryStatus: 'delivered',
      gmailMessageId: 'real_msg_987',
      gmailConfirmed: true,
      recipientEmail: 'shop@realshop.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // When Gmail is not connected (isGmailConnected: false)
    const stats = computeHomeStats({
      businesses: [realBiz],
      drafts: [draftWithMsgId],
      isGmailConnected: false,
      showDemo: false,
    });

    expect(stats.isGmailConnected).toBe(false);
    expect(stats.sentCount).toBe(0);
    expect(stats.confirmedDeliveries).toBe(0);
  });
});
