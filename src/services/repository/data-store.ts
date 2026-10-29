import { 
  BusinessEntity, 
  GrowthEvidenceEntity, 
  WebsiteCheckEntity, 
  ContactEntity, 
  LeadScoreEntity, 
  EmailDraftEntity, 
  CampaignEntity, 
  SuppressionEntry, 
  AutomationJobEntity,
  PipelineType,
  WebsiteStatus,
  OperatingMode
} from '@/types';
import { normalizeBusinessName, normalizeEmail } from '../crm/normalization';
import { normalizeDomain } from '../website/verifier';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export class DataStore {
  private businesses: Map<string, BusinessEntity> = new Map();
  private evidence: Map<string, GrowthEvidenceEntity[]> = new Map(); // businessId -> evidence[]
  private websiteChecks: Map<string, WebsiteCheckEntity> = new Map(); // businessId -> check
  private contacts: Map<string, ContactEntity[]> = new Map(); // businessId -> contacts[]
  private scores: Map<string, LeadScoreEntity> = new Map(); // businessId -> score
  private drafts: Map<string, EmailDraftEntity> = new Map(); // draftId -> draft
  private campaigns: Map<string, CampaignEntity> = new Map(); // campaignId -> campaign
  private suppression: Map<string, SuppressionEntry> = new Map(); // value -> entry
  private jobs: Map<string, AutomationJobEntity> = new Map(); // jobId -> job
  private auditLogs: Array<any> = [];
  private operatingMode: OperatingMode = 'approval'; // 'research' | 'approval' | 'auto_send'
  private automationPaused: boolean = false;
  private distributedLocks: Map<string, number> = new Map(); // lockName -> expiresAt
  private schedulerRuns: Array<any> = [];

  constructor() {
    this.seedInitialData();
  }

  public resetToSeedData(): void {
    this.businesses.clear();
    this.evidence.clear();
    this.websiteChecks.clear();
    this.contacts.clear();
    this.scores.clear();
    this.drafts.clear();
    this.campaigns.clear();
    this.suppression.clear();
    this.jobs.clear();
    this.auditLogs = [];
    this.operatingMode = 'approval';
    this.automationPaused = false;
    this.distributedLocks.clear();
    this.schedulerRuns = [];
    this.seedInitialData();
  }

  private seedInitialData(): void {
    // Lead 1: Pipeline A (Website Opportunity)
    const b1Id = 'biz-001-vanguard-hvac';
    const b1: BusinessEntity = {
      id: b1Id,
      organizationId: 'org-demo-001',
      name: 'Vanguard Precision HVAC & Plumbing',
      normalizedName: normalizeBusinessName('Vanguard Precision HVAC & Plumbing'),
      domain: null,
      normalizedDomain: null,
      country: 'US',
      region: 'Texas',
      city: 'Austin',
      postalCode: '78701',
      address: '1420 Colorado St, Austin, TX 78701',
      phone: '+1-512-555-0142',
      industry: 'HVAC & Facility Maintenance',
      companyType: 'Commercial LLC',
      employeeCountRange: '10-25',
      annualRevenueRange: '$1M - $3M',
      pipelineType: 'website_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'google_places',
      sourceIdentifier: 'gplace_vanguard_hvac',
      isArchived: false,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.businesses.set(b1Id, b1);

    this.evidence.set(b1Id, [
      {
        id: 'ev-001-a',
        businessId: b1Id,
        sourceName: 'Austin Commercial Registry',
        sourceUrl: 'https://records.traviscountytx.gov/commercial/vanguard-hvac',
        observationTime: new Date(Date.now() - 14 * 86400000).toISOString(),
        evidenceType: 'commercial_registration',
        summary: 'Active commercial HVAC license and business registry active in Travis County since 2021.',
        isFactual: true,
        confidence: 0.95,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ev-001-b',
        businessId: b1Id,
        sourceName: 'Google Business Profile Reviews',
        sourceUrl: 'https://maps.google.com/?cid=1029384756',
        observationTime: new Date(Date.now() - 3 * 86400000).toISOString(),
        evidenceType: 'customer_review_velocity',
        summary: 'Received 48 verified customer reviews with 4.8 star average over past 6 months; consistent customer transaction volume.',
        isFactual: true,
        confidence: 0.90,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
    ]);

    this.websiteChecks.set(b1Id, {
      id: 'wc-001',
      businessId: b1Id,
      domain: null,
      status: 'apparently_absent',
      isPrivateIp: false,
      checkedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      errorDetails: 'No registered domain or active web page recorded in commercial directories.',
    });

    this.contacts.set(b1Id, [
      {
        id: 'c-001',
        businessId: b1Id,
        fullName: 'Marcus Vance',
        firstName: 'Marcus',
        lastName: 'Vance',
        title: 'Managing Partner',
        email: 'marcus.vance@vanguardhvac-service.internal',
        normalizedEmail: 'marcus.vance@vanguardhvac-service.internal',
        phone: '+1-512-555-0142',
        linkedinUrl: 'https://linkedin.com/in/marcus-vance-hvac',
        confidence: 0.88,
        verificationStatus: 'verified',
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    this.scores.set(b1Id, {
      id: 'sc-001',
      businessId: b1Id,
      overallScore: 88,
      activityScore: 85,
      serviceFitScore: 90,
      websiteOpportunityScore: 95,
      aiOpportunityScore: 20,
      contactQualityScore: 85,
      confidenceScore: 0.92,
      reasoning: 'Qualified for Pipeline A (Website Opportunities). Business has verified commercial revenue and steady customer review volume but lacks an active website. High conversion candidate for custom online booking and local conversion pages.',
      scoreBreakdown: {
        verifiedEvidenceCount: 2,
        hasOfficialRegistry: true,
        websiteStatus: 'apparently_absent',
      },
      scoredAt: new Date().toISOString(),
    });

    // Lead 2: Pipeline B (AI & Software Opportunities)
    const b2Id = 'biz-002-docusync-saas';
    const b2: BusinessEntity = {
      id: b2Id,
      organizationId: 'org-demo-001',
      name: 'DocuSync Logistics Cloud',
      normalizedName: normalizeBusinessName('DocuSync Logistics Cloud'),
      domain: 'docusynclogistics.io',
      normalizedDomain: 'docusynclogistics.io',
      country: 'US',
      region: 'Illinois',
      city: 'Chicago',
      postalCode: '60606',
      address: '222 W Adams St, Chicago, IL 60606',
      phone: '+1-312-555-0198',
      industry: 'Supply Chain SaaS & Logistics Tech',
      companyType: 'B2B SaaS Startup',
      employeeCountRange: '15-40',
      annualRevenueRange: '$2M - $5M',
      pipelineType: 'ai_software_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'tech_directory',
      sourceIdentifier: 'techdir_docusync',
      isArchived: false,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.businesses.set(b2Id, b2);

    this.evidence.set(b2Id, [
      {
        id: 'ev-002-a',
        businessId: b2Id,
        sourceName: 'LinkedIn Job Postings',
        sourceUrl: 'https://linkedin.com/jobs/view/docusync-senior-python-rag-engineer',
        observationTime: new Date(Date.now() - 5 * 86400000).toISOString(),
        evidenceType: 'hiring_signal',
        summary: 'Actively recruiting for Senior Python Engineer with RAG, LangChain, and FastAPI expertise to automate bill-of-lading document parsing.',
        isFactual: true,
        confidence: 0.95,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ev-002-b',
        businessId: b2Id,
        sourceName: 'TechCrunch Release',
        sourceUrl: 'https://techcrunch.com/2026/08/15/docusync-seed-round',
        observationTime: new Date(Date.now() - 60 * 86400000).toISOString(),
        evidenceType: 'funding_and_expansion',
        summary: 'Closed $2.8M Seed round to expand automated freight document intelligence capabilities.',
        isFactual: true,
        confidence: 0.98,
        freshnessScore: 0.9,
        createdAt: new Date().toISOString(),
      },
    ]);

    this.websiteChecks.set(b2Id, {
      id: 'wc-002',
      businessId: b2Id,
      domain: 'docusynclogistics.io',
      status: 'functional',
      httpStatusCode: 200,
      tlsValid: true,
      ipAddress: '104.21.55.19',
      isPrivateIp: false,
      pageTitle: 'DocuSync — Modern Logistics Cloud Platform',
      checkedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    });

    this.contacts.set(b2Id, [
      {
        id: 'c-002',
        businessId: b2Id,
        fullName: 'Alexander Wright',
        firstName: 'Alexander',
        lastName: 'Wright',
        title: 'VP of Product & Engineering',
        email: 'alex.wright@docusynclogistics.io',
        normalizedEmail: 'alex.wright@docusynclogistics.io',
        phone: '+1-312-555-0198',
        linkedinUrl: 'https://linkedin.com/in/alex-wright-tech',
        confidence: 0.95,
        verificationStatus: 'verified',
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    this.scores.set(b2Id, {
      id: 'sc-002',
      businessId: b2Id,
      overallScore: 92,
      activityScore: 90,
      serviceFitScore: 94,
      websiteOpportunityScore: 10,
      aiOpportunityScore: 95,
      contactQualityScore: 92,
      confidenceScore: 0.96,
      reasoning: 'Qualified for Pipeline B (AI & Software Opportunities). Company has raised seed capital and has documented public job postings for Python RAG engineers to parse complex freight documents. Prime candidate for contract AI/RAG architecture and Python API development.',
      scoreBreakdown: {
        matchedAiSignals: ['rag', 'llm', 'python', 'fastapi', 'document intelligence'],
        hiringUrgency: 'High',
      },
      scoredAt: new Date().toISOString(),
    });

    // Seed default Campaign
    const campId = 'camp-001-rag-expansion';
    this.campaigns.set(campId, {
      id: campId,
      organizationId: 'org-demo-001',
      name: 'Q4 AI & RAG Engineering Outreach',
      targetPipeline: 'ai_software_opportunities',
      strategy: 'rag_systems',
      status: 'draft',
      requiresApproval: true,
      dailyCap: 25,
      sendingWindowStart: 9,
      sendingWindowEnd: 17,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        totalLeads: 1,
        approvedLeads: 0,
        sentCount: 0,
        deliveredCount: 0,
        repliedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
      },
    });

    // Seed default Draft
    const draftId = 'draft-001-docusync';
    this.drafts.set(draftId, {
      id: draftId,
      businessId: b2Id,
      contactId: 'c-002',
      campaignId: campId,
      strategy: 'rag_systems',
      subjectLines: [
        'Automating document workflows for DocuSync Logistics Cloud',
        'AI automation & RAG architecture for DocuSync Logistics Cloud',
        'Engineering support on LLM / Python workflows for DocuSync Logistics Cloud',
      ],
      selectedSubject: 'Automating document workflows for DocuSync Logistics Cloud',
      emailBody: `Hi Alexander,

I noted DocuSync's work in Supply Chain SaaS & Logistics Tech and your recent technical expansion around automated processing.

Deploying production LLM and RAG pipelines often introduces hurdles around retrieval latency, chunking accuracy, and strict output validation. As an AI Automation Architect and Python Developer, I build secure, high-throughput RAG systems and LLM integrations that plug cleanly into your existing architecture.

Would you be open to a brief 15-minute technical exchange this week to review your current LLM pipeline requirements?

Best regards,

Senior Full Stack AI Developer
AI Automation Architect & Senior Python Engineer
LLMs, RAG, Data Pipelines & Full-Stack Systems`,
      callToAction: 'Would you be open to a brief 15-minute technical exchange this week to review your current LLM pipeline requirements?',
      serviceOffer: 'End-to-end RAG and LLM agent architecture: vector search, hybrid retrieval, guardrails against hallucinations, and scalable FastAPI/Python microservices.',
      researchSummary: 'Observed technical development signals at DocuSync Logistics Cloud, including documented demand for AI pipelines, LLM knowledge retrieval, and automated document processing.',
      observations: [
        {
          fact: 'Actively recruiting for Senior Python Engineer with RAG, LangChain, and FastAPI expertise.',
          source: 'LinkedIn Job Postings',
          isVerified: true,
        },
      ],
      rationale: 'Company requires senior technical capacity to build and evaluate their core document parsing LLM pipeline.',
      warnings: [],
      confidenceRating: 0.94,
      version: 1,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed Sample Suppression
    this.suppression.set('optout@competitor.com', {
      id: 'sup-001',
      organizationId: 'org-demo-001',
      type: 'email',
      value: 'optout@competitor.com',
      reason: 'unsubscribe',
      notes: 'User unsubscribed via automated footer link.',
      createdAt: new Date().toISOString(),
    });
  }

  // --- Businesses ---
  public getBusinesses(filter?: {
    pipeline?: PipelineType | 'all';
    search?: string;
    qualificationStatus?: string;
    country?: string;
    limit?: number;
    offset?: number;
  }): { businesses: BusinessEntity[]; total: number } {
    let list = Array.from(this.businesses.values());

    if (filter?.pipeline && filter.pipeline !== 'all') {
      list = list.filter(b => b.pipelineType === filter.pipeline);
    }
    if (filter?.qualificationStatus && filter.qualificationStatus !== 'all') {
      list = list.filter(b => b.qualificationStatus === filter.qualificationStatus);
    }
    if (filter?.country && filter.country !== 'all') {
      list = list.filter(b => b.country === filter.country);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(b => 
        b.name.toLowerCase().includes(q) ||
        (b.domain && b.domain.toLowerCase().includes(q)) ||
        (b.industry && b.industry.toLowerCase().includes(q)) ||
        (b.city && b.city.toLowerCase().includes(q))
      );
    }

    const total = list.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;

    const populated = list.slice(offset, offset + limit).map(b => ({
      ...b,
      evidence: this.evidence.get(b.id) || [],
      websiteCheck: this.websiteChecks.get(b.id) || null,
      contacts: this.contacts.get(b.id) || [],
      score: this.scores.get(b.id) || null,
    }));

    return { businesses: populated, total };
  }

  public getBusinessById(id: string): BusinessEntity | null {
    const b = this.businesses.get(id);
    if (!b) return null;
    return {
      ...b,
      evidence: this.evidence.get(b.id) || [],
      websiteCheck: this.websiteChecks.get(b.id) || null,
      contacts: this.contacts.get(b.id) || [],
      score: this.scores.get(b.id) || null,
    };
  }

  public saveBusiness(b: BusinessEntity): void {
    this.businesses.set(b.id, b);
  }

  public saveEvidence(businessId: string, ev: GrowthEvidenceEntity[]): void {
    const existing = this.evidence.get(businessId) || [];
    this.evidence.set(businessId, [...existing, ...ev]);
  }

  public saveWebsiteCheck(check: WebsiteCheckEntity): void {
    this.websiteChecks.set(check.businessId, check);
  }

  public saveLeadScore(score: LeadScoreEntity): void {
    this.scores.set(score.businessId, score);
  }

  public saveContact(contact: ContactEntity): void {
    const list = this.contacts.get(contact.businessId) || [];
    list.push(contact);
    this.contacts.set(contact.businessId, list);
  }

  // --- Drafts & Approvals ---
  public getDrafts(filter?: { status?: string; campaignId?: string }): EmailDraftEntity[] {
    let list = Array.from(this.drafts.values());
    if (filter?.status && filter.status !== 'all') {
      list = list.filter(d => d.status === filter.status);
    }
    if (filter?.campaignId) {
      list = list.filter(d => d.campaignId === filter.campaignId);
    }
    return list;
  }

  public getDraftById(id: string): EmailDraftEntity | null {
    return this.drafts.get(id) || null;
  }

  public saveDraft(draft: EmailDraftEntity): void {
    this.drafts.set(draft.id, draft);
  }

  public updateDraftStatus(
    id: string, 
    status: 'draft' | 'approved' | 'rejected' | 'sent', 
    approvedBy?: string
  ): EmailDraftEntity | null {
    const draft = this.drafts.get(id);
    if (!draft) return null;

    draft.status = status;
    if (status === 'approved') {
      draft.approvedBy = approvedBy || 'admin';
      draft.approvedAt = new Date().toISOString();
    }
    draft.updatedAt = new Date().toISOString();
    this.drafts.set(id, draft);
    return draft;
  }

  // --- Campaigns ---
  public getCampaigns(): CampaignEntity[] {
    return Array.from(this.campaigns.values());
  }

  public getCampaignById(id: string): CampaignEntity | null {
    return this.campaigns.get(id) || null;
  }

  public saveCampaign(campaign: CampaignEntity): void {
    this.campaigns.set(campaign.id, campaign);
  }

  // --- Suppression ---
  public getSuppressionList(): SuppressionEntry[] {
    return Array.from(this.suppression.values());
  }

  public addSuppression(entry: SuppressionEntry): void {
    this.suppression.set(entry.value.toLowerCase(), entry);
  }

  public isSuppressed(emailOrDomain: string): boolean {
    const clean = emailOrDomain.trim().toLowerCase();
    if (this.suppression.has(clean)) return true;

    if (clean.includes('@')) {
      const domain = clean.split('@')[1];
      if (this.suppression.has(domain)) return true;
    }

    return false;
  }

  // --- Jobs ---
  public getJobs(): AutomationJobEntity[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public saveJob(job: AutomationJobEntity): void {
    this.jobs.set(job.id, job);
  }

  public updateJob(id: string, updates: Partial<AutomationJobEntity>): AutomationJobEntity | null {
    const j = this.jobs.get(id);
    if (!j) return null;
    const updated = { ...j, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    return updated;
  }

  // --- Operating Modes & Safety Switches ---
  public getOperatingMode(): OperatingMode {
    return this.operatingMode;
  }

  public setOperatingMode(mode: OperatingMode): void {
    this.operatingMode = mode;
  }

  public isAutomationPaused(): boolean {
    return this.automationPaused;
  }

  public setAutomationPaused(paused: boolean): void {
    this.automationPaused = paused;
  }

  // --- Distributed Scheduler Lock (Anti-Overlap) ---
  public acquireLock(name: string, ttlMs: number = 600000): boolean {
    const now = Date.now();
    const existingExpiresAt = this.distributedLocks.get(name);

    if (existingExpiresAt && existingExpiresAt > now) {
      return false; // Lock active; prevents overlapping execution
    }

    this.distributedLocks.set(name, now + ttlMs);
    return true;
  }

  public releaseLock(name: string): void {
    this.distributedLocks.delete(name);
  }

  // --- Scheduler Runs History ---
  public recordSchedulerRun(run: any): void {
    this.schedulerRuns.unshift({
      id: `run_${Date.now()}`,
      executedAt: new Date().toISOString(),
      ...run,
    });
    if (this.schedulerRuns.length > 50) {
      this.schedulerRuns.pop();
    }
  }

  public getSchedulerRuns(): any[] {
    return this.schedulerRuns;
  }

  public getLastSchedulerRun(): any | null {
    return this.schedulerRuns.length > 0 ? this.schedulerRuns[0] : null;
  }

  // --- Analytics & Stats ---
  public getPlatformStats() {
    const allBiz = Array.from(this.businesses.values());
    const pipeA = allBiz.filter(b => b.pipelineType === 'website_opportunities');
    const pipeB = allBiz.filter(b => b.pipelineType === 'ai_software_opportunities');
    const drafts = Array.from(this.drafts.values());
    const approvedDrafts = drafts.filter(d => d.status === 'approved');
    const sentDrafts = drafts.filter(d => d.status === 'sent');
    const suppressionCount = this.suppression.size;

    return {
      totalBusinesses: allBiz.length,
      pipelineAOpportunities: pipeA.length,
      pipelineBOpportunities: pipeB.length,
      qualifiedTotal: allBiz.filter(b => b.qualificationStatus === 'qualified').length,
      totalDrafts: drafts.length,
      approvedDrafts: approvedDrafts.length,
      sentCount: sentDrafts.length,
      suppressionCount,
      activeCampaigns: Array.from(this.campaigns.values()).filter(c => c.status === 'running' || c.status === 'scheduled').length,
      operatingMode: this.operatingMode,
      automationPaused: this.automationPaused,
      lastSchedulerRun: this.getLastSchedulerRun(),
    };
  }
}

export const dataStore = new DataStore();
