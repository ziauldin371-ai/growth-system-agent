import { dataStore } from '../repository/data-store';
import { discoveryService } from '../discovery/discovery-service';
import { verifyWebsite } from '../website/verifier';
import { icpEngine } from '../scoring/icp-engine';
import { outreachService } from '../ai/outreach-service';
import { emailService } from '../email/email-service';
import { normalizeBusinessName, isDuplicateBusiness } from '../crm/normalization';
import crypto from 'crypto';

export interface ScheduledRunResult {
  runId: string;
  status: 'completed' | 'skipped' | 'failed';
  leadsDiscovered: number;
  leadsQualified: number;
  draftsGenerated: number;
  emailsSent: number;
  operatingMode: string;
  reason?: string;
  durationMs: number;
}

export class AutomationRunner {
  private readonly LOCK_NAME = 'scheduler_global_run_lock';

  /**
   * Primary entry point for scheduled runs (09:00 & 17:00 PKT / 04:00 & 12:00 UTC)
   * or manual dashboard 'Run Now' invocations.
   */
  public async executeScheduledRun(triggeredBy: string = 'scheduler', currentHourOverride?: number): Promise<ScheduledRunResult> {
    const startTime = Date.now();
    const runId = `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 1. Acquire distributed lock to prevent overlapping invocations
    const acquired = dataStore.acquireLock(this.LOCK_NAME, 600000); // 10 min TTL
    if (!acquired) {
      return {
        runId,
        status: 'skipped',
        leadsDiscovered: 0,
        leadsQualified: 0,
        draftsGenerated: 0,
        emailsSent: 0,
        operatingMode: dataStore.getOperatingMode(),
        reason: 'Another automation run is currently in progress. Overlapping invocation skipped.',
        durationMs: Date.now() - startTime,
      };
    }

    try {
      // 2. Check Global Pause Switch
      if (dataStore.isAutomationPaused()) {
        const result: ScheduledRunResult = {
          runId,
          status: 'skipped',
          leadsDiscovered: 0,
          leadsQualified: 0,
          draftsGenerated: 0,
          emailsSent: 0,
          operatingMode: dataStore.getOperatingMode(),
          reason: 'Automation is globally paused by operator.',
          durationMs: Date.now() - startTime,
        };
        dataStore.recordSchedulerRun(result);
        return result;
      }

      const operatingMode = dataStore.getOperatingMode();
      let totalDiscovered = 0;
      let totalQualified = 0;
      let totalDrafts = 0;
      let totalSent = 0;

      // 3. Multi-Market Discovery
      const discoveryResult = await discoveryService.executeDiscovery({
        market: 'US',
        targetPipeline: 'both',
        industry: 'Software & Technology Services',
        provider: 'auto',
        limit: 10,
        keywords: ['AI', 'Python', 'Web'],
      });

      totalDiscovered = discoveryResult.leads.length;

      for (const raw of discoveryResult.leads) {
        const normName = normalizeBusinessName(raw.name);

        // Deduplication
        const existing = dataStore.getBusinesses().businesses;
        const isDup = existing.some(b => isDuplicateBusiness(
          { normalizedName: normName, normalizedDomain: raw.domain, phone: raw.phone, city: raw.city },
          b
        ));

        if (isDup) continue;

        const bizId = `biz_${crypto.randomBytes(6).toString('hex')}`;
        const newBiz: any = {
          id: bizId,
          organizationId: 'org-demo-001',
          name: raw.name,
          normalizedName: normName,
          domain: raw.domain || null,
          normalizedDomain: raw.domain ? raw.domain.toLowerCase() : null,
          country: raw.country || 'US',
          region: raw.region,
          city: raw.city,
          postalCode: raw.postalCode,
          address: raw.address,
          phone: raw.phone,
          industry: raw.industry,
          companyType: raw.companyType,
          employeeCountRange: raw.employeeCountRange,
          annualRevenueRange: raw.annualRevenueRange,
          pipelineType: 'unassigned',
          qualificationStatus: 'unreviewed',
          sourceProvider: raw.sourceProvider,
          sourceIdentifier: raw.sourceIdentifier,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dataStore.saveBusiness(newBiz);

        // Save Evidence
        if (raw.evidence && raw.evidence.length > 0) {
          const evList = raw.evidence.map((ev, idx) => ({
            id: `ev_${bizId}_${idx}`,
            businessId: bizId,
            sourceName: ev.sourceName,
            sourceUrl: ev.sourceUrl,
            observationTime: ev.observationTime,
            evidenceType: ev.evidenceType,
            summary: ev.summary,
            isFactual: ev.isFactual,
            confidence: ev.confidence,
            freshnessScore: 1.0,
            createdAt: new Date().toISOString(),
          }));
          dataStore.saveEvidence(bizId, evList);
        }

        // SSRF-safe Website Verification
        const webCheckResult = await verifyWebsite({
          domain: raw.domain,
          socialUrls: raw.socialUrls,
          businessName: raw.name,
        });

        dataStore.saveWebsiteCheck({
          id: `wc_${bizId}`,
          businessId: bizId,
          domain: raw.domain,
          status: webCheckResult.status,
          httpStatusCode: webCheckResult.httpStatusCode,
          tlsValid: webCheckResult.tlsValid,
          ipAddress: webCheckResult.ipAddress,
          isPrivateIp: webCheckResult.isPrivateIp,
          redirectChain: webCheckResult.redirectChain,
          pageTitle: webCheckResult.pageTitle,
          verificationLatencyMs: webCheckResult.verificationLatencyMs,
          checkedAt: new Date().toISOString(),
          errorDetails: webCheckResult.errorDetails,
        });

        // ICP Scoring
        const scored = icpEngine.evaluateLead({
          business: newBiz,
          evidence: dataStore.getBusinessById(bizId)?.evidence || [],
          websiteCheck: webCheckResult as any,
          contacts: raw.contacts as any || [],
        });

        newBiz.pipelineType = scored.targetPipeline;
        newBiz.qualificationStatus = scored.overallScore >= 60 ? 'qualified' : 'unreviewed';
        dataStore.saveBusiness(newBiz);

        dataStore.saveLeadScore({
          id: `sc_${bizId}`,
          businessId: bizId,
          overallScore: scored.overallScore,
          activityScore: scored.activityScore,
          serviceFitScore: scored.serviceFitScore,
          websiteOpportunityScore: scored.websiteOpportunityScore,
          aiOpportunityScore: scored.aiOpportunityScore,
          contactQualityScore: scored.contactQualityScore,
          confidenceScore: scored.confidenceScore,
          reasoning: scored.reasoning,
          scoreBreakdown: scored.scoreBreakdown,
          scoredAt: new Date().toISOString(),
        });

        if (newBiz.qualificationStatus === 'qualified') {
          totalQualified++;
        }

        // Save Contacts
        if (raw.contacts && raw.contacts.length > 0) {
          for (const c of raw.contacts) {
            dataStore.saveContact({
              id: `c_${crypto.randomBytes(6).toString('hex')}`,
              businessId: bizId,
              fullName: c.fullName,
              firstName: c.firstName,
              lastName: c.lastName,
              title: c.title,
              email: c.email,
              normalizedEmail: c.email ? c.email.toLowerCase() : null,
              phone: c.phone,
              linkedinUrl: c.linkedinUrl,
              confidence: c.confidence,
              verificationStatus: c.verificationStatus,
              isPrimary: c.isPrimary,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 4. Draft Generation (Only in 'approval' or 'auto_send' modes; skipped in 'research' mode)
        if (operatingMode !== 'research' && newBiz.qualificationStatus === 'qualified') {
          const draftRes = await outreachService.generateDraft({
            business: newBiz,
            evidence: dataStore.getBusinessById(bizId)?.evidence || [],
            websiteCheck: webCheckResult as any,
            contact: raw.contacts?.[0] as any || null,
            strategy: scored.targetPipeline === 'website_opportunities' ? 'web_development' : 'rag_systems',
            senderProfile: {
              name: 'Zia Ul Din',
              title: 'Full Stack AI Developer & Automation Architect',
              specialization: 'LLMs, Python, Data Science & Workflow Automation',
            },
          });

          const draftId = `draft_${crypto.randomBytes(6).toString('hex')}`;
          const isAutoSend = operatingMode === 'auto_send';

          const draftEntity: any = {
            id: draftId,
            businessId: bizId,
            contactId: raw.contacts?.[0] ? 'c_0' : null,
            campaignId: 'camp-001-rag-expansion',
            strategy: scored.targetPipeline === 'website_opportunities' ? 'web_development' : 'rag_systems',
            ...draftRes.draft,
            version: 1,
            status: isAutoSend ? 'approved' : 'draft', // Draft by default unless controlled auto-send is active
            approvedBy: isAutoSend ? 'auto_send_policy' : null,
            approvedAt: isAutoSend ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          dataStore.saveDraft(draftEntity);
          totalDrafts++;

          // 5. Controlled Auto-Send (Only if explicitly enabled and approved)
          if (isAutoSend && raw.contacts?.[0]?.email) {
            const sendResult = await emailService.dispatchOutreachEmail({
              payload: {
                to: raw.contacts[0].email,
                subject: draftEntity.selectedSubject,
                body: draftEntity.emailBody,
                draftId: draftEntity.id,
                idempotencyKey: `auto_${draftEntity.id}`,
                metadata: { htmlBody: draftEntity.htmlBody },
              },
              isExplicitlyApproved: true,
              currentHour: currentHourOverride !== undefined ? currentHourOverride : 10,
            });

            if (sendResult.success) {
              dataStore.updateDraftStatus(draftId, 'sent');
              totalSent++;
            }
          }
        }
      }

      const runSummary: ScheduledRunResult = {
        runId,
        status: 'completed',
        leadsDiscovered: totalDiscovered,
        leadsQualified: totalQualified,
        draftsGenerated: totalDrafts,
        emailsSent: totalSent,
        operatingMode,
        durationMs: Date.now() - startTime,
      };

      dataStore.recordSchedulerRun(runSummary);
      return runSummary;

    } finally {
      dataStore.releaseLock(this.LOCK_NAME);
    }
  }
}

export const automationRunner = new AutomationRunner();
