import crypto from 'crypto';
import { AutomationJobEntity, JobStatus } from '@/types';
import { dataStore } from '../repository/data-store';
import { discoveryService } from '../discovery/discovery-service';
import { verifyWebsite } from '../website/verifier';
import { icpEngine } from '../scoring/icp-engine';
import { outreachService } from '../ai/outreach-service';
import { emailService } from '../email/email-service';
import { normalizeBusinessName, isDuplicateBusiness } from '../crm/normalization';

export interface EnqueueJobOptions {
  jobType: 'discovery_crawl' | 'website_verify' | 'score_leads' | 'generate_draft' | 'send_approved_email';
  payload: Record<string, any>;
  priority?: number;
  idempotencyKey?: string;
  maxRetries?: number;
}

export class JobQueue {
  private isProcessing: boolean = false;
  private concurrencyLimit: number = 2;
  private activeWorkers: number = 0;

  /**
   * Enqueues a job with idempotency checking.
   */
  public async enqueue(options: EnqueueJobOptions): Promise<AutomationJobEntity> {
    const { jobType, payload, priority = 0, idempotencyKey, maxRetries = 3 } = options;

    const key = idempotencyKey || `job_${crypto.randomBytes(8).toString('hex')}`;

    // Check if job with this idempotency key already exists
    const existing = dataStore.getJobs().find(j => j.idempotencyKey === key);
    if (existing) {
      return existing;
    }

    const job: AutomationJobEntity = {
      id: `job_${crypto.randomBytes(8).toString('hex')}`,
      idempotencyKey: key,
      jobType,
      status: 'pending',
      priority,
      payload,
      retryCount: 0,
      maxRetries,
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataStore.saveJob(job);
    this.triggerProcessing();
    return job;
  }

  /**
   * Starts processing loop for queued pending jobs.
   */
  public triggerProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Run tick asynchronously
    setTimeout(async () => {
      try {
        await this.processNextBatch();
      } finally {
        this.isProcessing = false;
      }
    }, 50);
  }

  private async processNextBatch(): Promise<void> {
    const pendingJobs = dataStore
      .getJobs()
      .filter(j => j.status === 'pending')
      .sort((a, b) => b.priority - a.priority || new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    for (const job of pendingJobs) {
      if (this.activeWorkers >= this.concurrencyLimit) {
        break;
      }
      this.executeJob(job);
    }
  }

  private async executeJob(job: AutomationJobEntity): Promise<void> {
    this.activeWorkers++;
    dataStore.updateJob(job.id, {
      status: 'running',
      lockedAt: new Date().toISOString(),
      lockedBy: `worker_${process.pid}`,
    });

    try {
      let result: any = null;

      switch (job.jobType) {
        case 'discovery_crawl':
          result = await this.handleDiscoveryCrawl(job.payload);
          break;
        case 'website_verify':
          result = await this.handleWebsiteVerify(job.payload as any);
          break;
        case 'score_leads':
          result = await this.handleScoreLeads(job.payload as any);
          break;
        case 'generate_draft':
          result = await this.handleGenerateDraft(job.payload as any);
          break;
        case 'send_approved_email':
          result = await this.handleSendApprovedEmail(job.payload as any);
          break;
        default:
          throw new Error(`Unsupported job type: ${job.jobType}`);
      }

      dataStore.updateJob(job.id, {
        status: 'completed',
        result,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const nextRetry = job.retryCount + 1;

      if (nextRetry >= job.maxRetries) {
        // Move to dead-letter queue
        dataStore.updateJob(job.id, {
          status: 'dead_letter',
          errorMessage: `Exceeded max retries (${job.maxRetries}): ${errorMsg}`,
          retryCount: nextRetry,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Schedule retry with exponential backoff and jitter
        const backoffMs = Math.pow(2, nextRetry) * 1000 + Math.floor(Math.random() * 500);
        dataStore.updateJob(job.id, {
          status: 'pending',
          retryCount: nextRetry,
          errorMessage: `Attempt ${nextRetry} failed: ${errorMsg}`,
          scheduledAt: new Date(Date.now() + backoffMs).toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      this.activeWorkers--;
    }
  }

  // --- Handlers ---

  private async handleDiscoveryCrawl(payload: any) {
    const discovery = await discoveryService.executeDiscovery(payload);
    let leadsProcessed = 0;
    let leadsAdded = 0;

    for (const raw of discovery.leads) {
      leadsProcessed++;
      const normName = normalizeBusinessName(raw.name);

      // Check for duplicate business in dataStore
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

      // Verify Website
      const webCheckResult = await verifyWebsite({
        domain: raw.domain,
        socialUrls: raw.socialUrls,
        businessName: raw.name,
      });

      const webCheckEntity: any = {
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
      };
      dataStore.saveWebsiteCheck(webCheckEntity);

      // Score Lead against ICP
      const evaluatedScore = icpEngine.evaluateLead({
        business: newBiz,
        evidence: dataStore.getBusinessById(bizId)?.evidence || [],
        websiteCheck: webCheckEntity,
        contacts: raw.contacts as any || [],
      });

      newBiz.pipelineType = evaluatedScore.targetPipeline;
      newBiz.qualificationStatus = evaluatedScore.overallScore >= 60 ? 'qualified' : 'unreviewed';
      dataStore.saveBusiness(newBiz);

      dataStore.saveLeadScore({
        id: `sc_${bizId}`,
        businessId: bizId,
        overallScore: evaluatedScore.overallScore,
        activityScore: evaluatedScore.activityScore,
        serviceFitScore: evaluatedScore.serviceFitScore,
        websiteOpportunityScore: evaluatedScore.websiteOpportunityScore,
        aiOpportunityScore: evaluatedScore.aiOpportunityScore,
        contactQualityScore: evaluatedScore.contactQualityScore,
        confidenceScore: evaluatedScore.confidenceScore,
        reasoning: evaluatedScore.reasoning,
        scoreBreakdown: evaluatedScore.scoreBreakdown,
        scoredAt: new Date().toISOString(),
      });

      // Save Contacts if present
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

      leadsAdded++;
    }

    return { leadsDiscovered: discovery.totalFound, leadsProcessed, leadsAdded };
  }

  private async handleWebsiteVerify(payload: { businessId: string; domain?: string | null }) {
    const check = await verifyWebsite({ domain: payload.domain });
    const entity: any = {
      id: `wc_${payload.businessId}`,
      businessId: payload.businessId,
      ...check,
      checkedAt: new Date().toISOString(),
    };
    dataStore.saveWebsiteCheck(entity);
    return check;
  }

  private async handleScoreLeads(payload: { businessId: string }) {
    const biz = dataStore.getBusinessById(payload.businessId);
    if (!biz) throw new Error(`Business ${payload.businessId} not found`);

    const scored = icpEngine.evaluateLead({
      business: biz,
      evidence: biz.evidence || [],
      websiteCheck: biz.websiteCheck,
      contacts: biz.contacts || [],
    });

    dataStore.saveLeadScore({
      id: `sc_${biz.id}`,
      businessId: biz.id,
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

    biz.pipelineType = scored.targetPipeline;
    dataStore.saveBusiness(biz);
    return scored;
  }

  private async handleGenerateDraft(payload: { businessId: string; strategy: any; campaignId?: string }) {
    const biz = dataStore.getBusinessById(payload.businessId);
    if (!biz) throw new Error(`Business ${payload.businessId} not found`);

    const result = await outreachService.generateDraft({
      business: biz,
      evidence: biz.evidence || [],
      websiteCheck: biz.websiteCheck,
      contact: biz.contacts?.[0] || null,
      strategy: payload.strategy,
      senderProfile: {
        name: 'Full Stack AI Developer',
        title: 'Senior AI Engineer & Automation Architect',
        specialization: 'LLMs, Python, RAG, Data Pipelines & Custom SaaS Web Apps',
      },
    });

    const draftId = `draft_${crypto.randomBytes(6).toString('hex')}`;
    const draftEntity: any = {
      id: draftId,
      businessId: biz.id,
      contactId: biz.contacts?.[0]?.id || null,
      campaignId: payload.campaignId || null,
      strategy: payload.strategy,
      ...result.draft,
      version: 1,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataStore.saveDraft(draftEntity);
    return { draftId, ...result };
  }

  private async handleSendApprovedEmail(payload: { draftId: string; approvedBy: string }) {
    const draft = dataStore.getDraftById(payload.draftId);
    if (!draft) throw new Error(`Draft ${payload.draftId} not found`);

    const biz = dataStore.getBusinessById(draft.businessId);
    const recipient = biz?.contacts?.find(c => c.id === draft.contactId)?.email || 'marcus.vance@vanguardhvac-service.internal';

    const sendRes = await emailService.dispatchOutreachEmail({
      payload: {
        to: recipient,
        subject: draft.selectedSubject,
        body: draft.emailBody,
        draftId: draft.id,
        idempotencyKey: `dispatch_${draft.id}_v${draft.version}`,
      },
      isExplicitlyApproved: draft.status === 'approved',
    });

    if (sendRes.success) {
      dataStore.updateDraftStatus(draft.id, 'sent');
    }

    return sendRes;
  }
}

export const jobQueue = new JobQueue();
