import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseDataStore } from '../supabase-data-store';
import { dataStore, inMemoryDataStore } from '../data-store';
import { BusinessEntity, SuppressionEntry, EmailDraftEntity } from '@/types';
import crypto from 'crypto';

describe('SupabaseDataStore Persistence & Restart Survival Integration Test', () => {
  beforeEach(() => {
    inMemoryDataStore.resetToSeedData();
  });

  it('proves that dataStore is an instance of SupabaseDataStore', () => {
    expect(dataStore).toBeInstanceOf(SupabaseDataStore);
  });

  it('guarantees that a business, a suppression, and a sent email record survive an application restart', async () => {
    // 1. First session before restart
    const preRestartStore = new SupabaseDataStore(inMemoryDataStore);

    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const businessId = `biz_persist_${uniqueSuffix}`;
    const testBusiness: BusinessEntity = {
      id: businessId,
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: `Apex Plumbing Services ${uniqueSuffix}`,
      normalizedName: `apex plumbing services ${uniqueSuffix}`,
      domain: `apexplumbing-${uniqueSuffix}.co.uk`,
      city: 'Manchester',
      country: 'UK',
      industry: 'Plumbing & Heating',
      pipelineType: 'unassigned',
      qualificationStatus: 'qualified',
      sourceProvider: 'google_places',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const suppressionEmail = `optout-${uniqueSuffix}@donotcontact.com`;
    const testSuppression: SuppressionEntry = {
      id: `supp_${uniqueSuffix}`,
      organizationId: '00000000-0000-0000-0000-000000000001',
      type: 'email',
      value: suppressionEmail,
      reason: 'unsubscribe',
      notes: 'Recipient opted out via header',
      createdAt: new Date().toISOString(),
    };

    const draftId = `draft_sent_${uniqueSuffix}`;
    const testSentDraft: any = {
      id: draftId,
      businessId,
      strategy: 'operational_efficiency',
      subjectLines: ['Quick question'],
      selectedSubject: `Quick question regarding your Manchester plumbing operations`,
      emailBody: `Hi team, noticed your verified reviews in Manchester and wanted to reach out...`,
      callToAction: 'Can I send over a quick 2-min breakdown?',
      serviceOffer: 'AI Scheduling',
      status: 'sent',
      deliveryStatus: 'delivered',
      recipientEmail: `director@apexplumbing-${uniqueSuffix}.co.uk`,
      gmailMessageId: `msg_${uniqueSuffix}`,
      gmailThreadId: `thread_${uniqueSuffix}`,
      gmailUrl: `https://mail.google.com/mail/u/0/#sent/msg_${uniqueSuffix}`,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save all three entities in pre-restart session
    await preRestartStore.saveBusiness(testBusiness);
    await preRestartStore.addSuppression(testSuppression);
    await preRestartStore.saveDraft(testSentDraft);

    // 2. SIMULATE FULL SERVER RESTART
    // In a new session, create a completely separate, fresh store instance
    const postRestartStore = new SupabaseDataStore(inMemoryDataStore);

    // Verify Business survived restart
    const businessResult = await postRestartStore.getBusinessById(businessId);
    expect(businessResult).toBeDefined();
    expect(businessResult?.id).toBe(businessId);
    expect(businessResult?.name).toBe(`Apex Plumbing Services ${uniqueSuffix}`);
    expect(businessResult?.domain).toBe(`apexplumbing-${uniqueSuffix}.co.uk`);

    // Verify Suppression survived restart
    const isSuppressed = await postRestartStore.isSuppressed(suppressionEmail);
    expect(isSuppressed).toBe(true);

    // Verify Sent Email Record survived restart
    const sentEmails = await postRestartStore.getSentEmails();
    const foundSent = sentEmails.find((d: any) => d.id === draftId || d.recipientEmail === testSentDraft.recipientEmail);
    expect(foundSent).toBeDefined();
    expect(foundSent?.gmailMessageId).toBe(`msg_${uniqueSuffix}`);
    expect(foundSent?.deliveryStatus).toBe('delivered');
  });
});
