import { describe, it, expect, beforeEach } from 'vitest';
import { discoveryService } from '../discovery/discovery-service';
import { verifyWebsite } from '../website/verifier';
import { icpEngine } from '../scoring/icp-engine';
import { outreachService } from '../ai/outreach-service';
import { emailService } from '../email/email-service';
import { webhookVerifier } from '../email/webhook-verifier';
import { inMemoryDataStore as dataStore } from '../repository/data-store';
import { isDuplicateBusiness, normalizeBusinessName } from '../crm/normalization';

describe('Complete End-to-End Workflow Audit', () => {
  beforeEach(() => {
    emailService.mockProvider.clearLog();
    process.env.EMERGENCY_STOP = 'false';
  });

  it('executes full autonomous lifecycle: discovery -> verify -> score -> draft -> approval gate -> mock delivery -> unsubscribe -> suppression', async () => {
    // 1. DISCOVERY
    const discoveryResult = await discoveryService.executeDiscovery({
      market: 'US',
      targetPipeline: 'both',
      industry: 'HVAC & Facility Maintenance',
      provider: 'b2b_mock',
      limit: 5,
      keywords: [],
    });

    expect(discoveryResult.leads.length).toBeGreaterThan(0);
    const candidate = discoveryResult.leads[0];
    expect(candidate.name).toBeDefined();

    // 2. DEDUPLICATION CHECK
    const normName = normalizeBusinessName(candidate.name);
    const isDup = isDuplicateBusiness(
      { normalizedName: normName, normalizedDomain: candidate.domain, city: candidate.city },
      { normalizedName: 'completely different company', city: 'Denver' }
    );
    expect(isDup).toBe(false);

    // 3. WEBSITE VERIFICATION (SSRF Protected)
    const webCheck = await verifyWebsite({
      domain: candidate.domain,
      socialUrls: candidate.socialUrls,
      businessName: candidate.name,
    });
    expect(webCheck.isPrivateIp).toBe(false); // Proves no private/loopback/cloud metadata IP was reached
    expect(['apparently_absent', 'social_only', 'parked', 'functional', 'broken', 'inconclusive']).toContain(webCheck.status);

    // 4. EVIDENCE COLLECTION & PROVENANCE
    expect(candidate.evidence.length).toBeGreaterThanOrEqual(1);
    const ev0 = candidate.evidence[0];
    expect(ev0.isFactual).toBe(true);
    expect(ev0.sourceName).toBeDefined();

    // 5. EXPLAINABLE ICP SCORING
    const mockBizEntity: any = {
      id: 'biz_e2e_001',
      organizationId: 'org-demo-001',
      name: candidate.name,
      normalizedName: normName,
      domain: candidate.domain,
      country: candidate.country,
      city: candidate.city,
      industry: candidate.industry,
      pipelineType: 'unassigned',
      qualificationStatus: 'unreviewed',
      sourceProvider: candidate.sourceProvider,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const evaluatedScore = icpEngine.evaluateLead({
      business: mockBizEntity,
      evidence: candidate.evidence as any,
      websiteCheck: webCheck as any,
      contacts: candidate.contacts as any,
    });

    expect(evaluatedScore.overallScore).toBeGreaterThan(0);
    expect(evaluatedScore.reasoning.length).toBeGreaterThan(20);
    expect(['website_opportunities', 'ai_software_opportunities']).toContain(evaluatedScore.targetPipeline);

    mockBizEntity.pipelineType = evaluatedScore.targetPipeline;
    mockBizEntity.qualificationStatus = 'qualified';
    dataStore.saveBusiness(mockBizEntity);

    // 6. AI PERSONALIZED OUTREACH GENERATION (Structured Zod Output)
    const outreachRes = await outreachService.generateDraft({
      business: mockBizEntity,
      evidence: candidate.evidence as any,
      websiteCheck: webCheck as any,
      contact: candidate.contacts?.[0] as any,
      strategy: evaluatedScore.targetPipeline === 'website_opportunities' ? 'web_development' : 'rag_systems',
      senderProfile: {
        name: 'Full Stack AI Developer',
        title: 'Senior AI Engineer & Automation Architect',
        specialization: 'LLMs, Python, RAG & Web Systems',
      },
    });

    const draft = outreachRes.draft;
    expect(draft.subjectLines.length).toBe(3);
    expect(draft.emailBody.length).toBeGreaterThan(50);
    expect(draft.valueProposition.length).toBeGreaterThan(20);

    const draftId = 'draft_e2e_001';
    dataStore.saveDraft({
      id: draftId,
      businessId: mockBizEntity.id,
      contactId: candidate.contacts?.[0] ? 'c_001' : null,
      campaignId: 'camp-001-rag-expansion',
      strategy: evaluatedScore.targetPipeline === 'website_opportunities' ? 'web_development' : 'rag_systems',
      ...draft,
      version: 1,
      status: 'draft', // INITIAL DRAFT-ONLY STATE
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 7. APPROVAL GATE ENFORCEMENT
    const recipientEmail = candidate.contacts?.[0]?.email || 'contact@candidate-lead.com';
    const prematureSendResult = await emailService.dispatchOutreachEmail({
      payload: {
        to: recipientEmail,
        subject: draft.selectedSubject,
        body: draft.emailBody,
        idempotencyKey: 'idemp-premature-send-01',
      },
      isExplicitlyApproved: false, // NOT APPROVED
      currentHour: 11,
    });

    // STRICTLY BLOCKED BY APPROVAL GATE
    expect(prematureSendResult.success).toBe(false);
    expect(prematureSendResult.status).toBe('rejected_compliance');
    expect(prematureSendResult.error).toContain('NOT_APPROVED');

    // 8. ADMINISTRATOR APPROVAL
    const approvedDraft = dataStore.updateDraftStatus(draftId, 'approved', 'admin@growthsignal.ai');
    expect(approvedDraft?.status).toBe('approved');
    expect(approvedDraft?.approvedBy).toBe('admin@growthsignal.ai');

    // 9. MOCK DELIVERY (Safe Mode - Zero real network calls)
    const authorizedSendResult = await emailService.dispatchOutreachEmail({
      payload: {
        to: recipientEmail,
        subject: draft.selectedSubject,
        body: draft.emailBody,
        idempotencyKey: 'idemp-authorized-send-01',
      },
      isExplicitlyApproved: true,
      currentHour: 11,
    });

    expect(authorizedSendResult.success).toBe(true);
    expect(authorizedSendResult.status).toBe('mock_delivered');
    expect(authorizedSendResult.provider).toBe('mock');

    // 10. DELIVERY TELEMETRY
    const eventRes = await webhookVerifier.processEvent({
      type: 'email.delivered',
      created_at: new Date().toISOString(),
      data: {
        to: [recipientEmail],
      },
    });
    expect(eventRes.processed).toBe(true);
    expect(eventRes.actionTaken).toBe('recorded_delivery');

    // 11. RECIPIENT UNSUBSCRIBE (Opt-out event)
    dataStore.addSuppression({
      id: 'sup_e2e_01',
      organizationId: 'org-demo-001',
      type: 'email',
      value: recipientEmail.toLowerCase(),
      reason: 'unsubscribe',
      notes: 'Recipient unsubscribed via one-click link',
      createdAt: new Date().toISOString(),
    });

    expect(dataStore.isSuppressed(recipientEmail)).toBe(true);

    // 12. SUPPRESSION ENFORCEMENT ON FUTURE SENDS
    const suppressedList = new Set(dataStore.getSuppressionList().map(s => s.value.toLowerCase()));
    const subsequentSendResult = await emailService.dispatchOutreachEmail({
      payload: {
        to: recipientEmail,
        subject: 'Follow up inquiry',
        body: 'Follow up body',
        idempotencyKey: 'idemp-subsequent-send-02',
      },
      isExplicitlyApproved: true,
      suppressedEmails: suppressedList,
      currentHour: 11,
    });

    expect(subsequentSendResult.success).toBe(false);
    expect(subsequentSendResult.status).toBe('rejected_compliance');
    expect(subsequentSendResult.error).toContain('SUPPRESSED');
  });
});

