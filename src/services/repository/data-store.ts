import fs from 'fs';
import path from 'path';
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
  OperatingMode,
  AlternativeChannelEntity,
  AlternativeChannelStatus,
  SchedulerRunHistoryEntity,
  PlatformEntity,
  VettedApplicationEntity,
  LeadSourceConfigEntity,
  PlatformFootprintCandidate,
  MarketplaceHotRequestEntity,
  PlatformSpendLogEntity,
  PlatformTrackerEntity,
  PlatformDailyTargetEntity,
  OperatorProfileEntity,
} from '@/types';
import { DEFAULT_OPERATOR_PROFILE } from '@/services/ai/platform-pitch-templates';
import { IDataStore } from './interface';
import { normalizeBusinessName, normalizeEmail } from '../crm/normalization';
import { normalizeDomain } from '../website/verifier';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isDemoOrSandboxRecord, isRealVerifiedSentEmail, computeHomeStats } from './demo-guard';

export class DataStore implements IDataStore {
  private persistenceFilePath: string;
  private businesses: Map<string, BusinessEntity> = new Map();
  private evidence: Map<string, GrowthEvidenceEntity[]> = new Map(); // businessId -> evidence[]
  private websiteChecks: Map<string, WebsiteCheckEntity> = new Map(); // businessId -> check
  private contacts: Map<string, ContactEntity[]> = new Map(); // businessId -> contacts[]
  private scores: Map<string, LeadScoreEntity> = new Map(); // businessId -> score
  private drafts: Map<string, EmailDraftEntity> = new Map(); // draftId -> draft
  private campaigns: Map<string, CampaignEntity> = new Map(); // campaignId -> campaign
  private suppression: Map<string, SuppressionEntry> = new Map(); // value -> entry
  private jobs: Map<string, AutomationJobEntity> = new Map(); // jobId -> job
  private alternativeChannels: Map<string, AlternativeChannelEntity> = new Map(); // channelId -> channel
  private auditLogs: Array<any> = [];
  private operatingMode: OperatingMode = (process.env.DEFAULT_SEND_MODE as OperatingMode) || 'auto_send';
  private automationPaused: boolean = false;
  private distributedLocks: Map<string, number> = new Map(); // lockName -> expiresAt
  private schedulerRuns: Array<SchedulerRunHistoryEntity> = [];
  private checkpoints: Map<string, any> = new Map(); // taskName -> checkpoint
  private platforms: Map<string, PlatformEntity> = new Map(); // platformId -> platform
  private vettedApplications: Map<string, VettedApplicationEntity> = new Map(); // platformId -> application
  private leadSourceConfigs: Map<string, LeadSourceConfigEntity> = new Map(); // sourceName -> config
  private platformFootprints: Map<string, PlatformFootprintCandidate[]> = new Map(); // businessId -> footprints[]
  private hotRequests: Map<string, MarketplaceHotRequestEntity> = new Map(); // requestId -> request
  private platformSpendLogs: Array<PlatformSpendLogEntity> = [];
  private demoModeActive: boolean = false;
  private platformTrackers: Map<string, PlatformTrackerEntity> = new Map();
  private platformDailyTargets: Map<string, PlatformDailyTargetEntity> = new Map();
  private operatorProfile: OperatorProfileEntity = {
    ...DEFAULT_OPERATOR_PROFILE,
    id: 'default',
    demoModeEnabled: false,
    updatedAt: new Date().toISOString(),
  };

  constructor(customPersistencePath?: string) {
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // ignore in readonly env
      }
    }
    this.persistenceFilePath = customPersistencePath || path.join(dataDir, 'data_store_persistence.json');
    this.seedPlatforms();
    this.seedInitialData();
    this.loadPersistedState();
  }

  private loadPersistedState(): void {
    try {
      if (fs.existsSync(this.persistenceFilePath)) {
        const raw = fs.readFileSync(this.persistenceFilePath, 'utf8');
        const state = JSON.parse(raw);
        if (state.suppression && Array.isArray(state.suppression)) {
          for (const s of state.suppression) {
            this.suppression.set(s.value.toLowerCase(), s);
          }
        }
        if (state.businesses && Array.isArray(state.businesses)) {
          for (const b of state.businesses) {
            this.businesses.set(b.id, b);
          }
        }
        if (state.drafts && Array.isArray(state.drafts)) {
          for (const d of state.drafts) {
            this.drafts.set(d.id, d);
          }
        }
        if (state.jobs && Array.isArray(state.jobs)) {
          for (const j of state.jobs) {
            this.jobs.set(j.id, j);
          }
        }
        if (state.alternativeChannels && Array.isArray(state.alternativeChannels)) {
          for (const c of state.alternativeChannels) {
            this.alternativeChannels.set(c.id, c);
          }
        }
        if (state.schedulerRuns && Array.isArray(state.schedulerRuns)) {
          this.schedulerRuns = state.schedulerRuns;
        }
        if (state.operatingMode) {
          this.operatingMode = state.operatingMode;
        }
        if (typeof state.automationPaused === 'boolean') {
          this.automationPaused = state.automationPaused;
        }
      }
    } catch (e) {
      console.warn('Failed to load persisted data store state from disk:', e);
    }
  }

  public persistState(): void {
    try {
      const state = {
        suppression: Array.from(this.suppression.values()),
        businesses: Array.from(this.businesses.values()),
        drafts: Array.from(this.drafts.values()),
        jobs: Array.from(this.jobs.values()),
        alternativeChannels: Array.from(this.alternativeChannels.values()),
        schedulerRuns: this.schedulerRuns,
        operatingMode: this.operatingMode,
        automationPaused: this.automationPaused,
      };
      const dir = path.dirname(this.persistenceFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.persistenceFilePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to persist data store state to disk:', e);
    }
  }

  public resetToSeedData(): void {
    try {
      if (fs.existsSync(this.persistenceFilePath)) {
        fs.unlinkSync(this.persistenceFilePath);
      }
    } catch {}

    this.businesses.clear();
    this.evidence.clear();
    this.websiteChecks.clear();
    this.contacts.clear();
    this.scores.clear();
    this.drafts.clear();
    this.campaigns.clear();
    this.suppression.clear();
    this.jobs.clear();
    this.alternativeChannels.clear();
    this.auditLogs = [];
    this.operatingMode = (process.env.DEFAULT_SEND_MODE as OperatingMode) || 'auto_send';
    this.automationPaused = false;
    this.distributedLocks.clear();
    this.schedulerRuns = [];
    this.seedInitialData();
  }

  private seedInitialData(force = false): void {
    if (process.env.NODE_ENV === 'production' && !force) {
      return;
    }
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

    // Seed sample alternative channels for Lead 1
    const ch1Id = 'ch-001-vanguard-linkedin';
    this.alternativeChannels.set(ch1Id, {
      id: ch1Id,
      businessId: b1Id,
      businessName: 'Vanguard Precision HVAC & Plumbing',
      country: 'US',
      platform: 'linkedin',
      profileUrl: 'https://linkedin.com/company/vanguard-precision-hvac',
      handleOrIdentifier: 'vanguard-precision-hvac',
      sourceName: 'LinkedIn Corporate Search',
      isUsable: true,
      customPitch: 'Hi Marcus, noticed Vanguard HVAC\'s steady growth in Travis County. As an AI & Web Developer, I build automated quote-intake and booking portals that convert local searchers into booked commercial HVAC contracts without manual scheduling friction. Would you be open to seeing a 2-minute demo?',
      status: 'not_contacted',
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Lead 3: Pipeline A (UK - Website Opportunity)
    const b3Id = 'biz-003-mayfair-dental';
    const b3: BusinessEntity = {
      id: b3Id,
      organizationId: 'org-demo-001',
      name: 'Mayfair Specialist Periodontics & Dental Studio',
      normalizedName: normalizeBusinessName('Mayfair Specialist Periodontics & Dental Studio'),
      domain: null,
      normalizedDomain: null,
      country: 'UK',
      region: 'Greater London',
      city: 'London',
      postalCode: 'W1K 2TH',
      address: '42 Berkeley Square, London W1K 2TH',
      phone: '+44 20 7946 0192',
      industry: 'Healthcare & Specialized Dental Surgery',
      companyType: 'Private Limited Company',
      employeeCountRange: '10-20',
      annualRevenueRange: '£1.5M - £3.5M',
      pipelineType: 'website_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'companies_house',
      sourceIdentifier: 'ch_12984712',
      isArchived: false,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.businesses.set(b3Id, b3);

    this.evidence.set(b3Id, [
      {
        id: 'ev-003-a',
        businessId: b3Id,
        sourceName: 'UK Companies House Registry',
        sourceUrl: 'https://find-and-update.company-information.service.gov.uk/company/12984712',
        observationTime: new Date(Date.now() - 10 * 86400000).toISOString(),
        evidenceType: 'official_registration',
        summary: 'Active incorporation with General Dental Council (GDC) specialist registration; audited filings indicate active private clinic operations.',
        isFactual: true,
        confidence: 0.98,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
    ]);

    this.websiteChecks.set(b3Id, {
      id: 'wc-003',
      businessId: b3Id,
      domain: null,
      status: 'apparently_absent',
      isPrivateIp: false,
      checkedAt: new Date().toISOString(),
      errorDetails: 'No active web portal or domain found; relying strictly on London clinic directories.',
    });

    this.contacts.set(b3Id, [
      {
        id: 'c-003',
        businessId: b3Id,
        fullName: 'Dr. Arthur Pendleton',
        firstName: 'Arthur',
        lastName: 'Pendleton',
        title: 'Clinical Director & Principal Surgeon',
        email: 'dr.arthur.pendleton@mayfair-dental-london.co.uk',
        normalizedEmail: 'dr.arthur.pendleton@mayfair-dental-london.co.uk',
        phone: '+44 20 7946 0192',
        confidence: 0.91,
        verificationStatus: 'verified',
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    this.scores.set(b3Id, {
      id: 'sc-003',
      businessId: b3Id,
      overallScore: 89,
      activityScore: 88,
      serviceFitScore: 92,
      websiteOpportunityScore: 96,
      aiOpportunityScore: 15,
      contactQualityScore: 88,
      confidenceScore: 0.94,
      reasoning: 'High-priority UK website opportunity. Active private specialist practice in Mayfair with strong NHS/private patient demand but lacking an official responsive portal and online appointment booking engine.',
      scoreBreakdown: {
        ukCompaniesHouseActive: true,
        verifiedDirectEmail: true,
        missingWebsite: true,
      },
      scoredAt: new Date().toISOString(),
    });

    const ch3Id = 'ch-003-mayfair-instagram';
    this.alternativeChannels.set(ch3Id, {
      id: ch3Id,
      businessId: b3Id,
      businessName: b3.name,
      country: 'UK',
      platform: 'instagram',
      profileUrl: 'https://instagram.com/mayfairdentalstudio',
      handleOrIdentifier: '@mayfairdentalstudio',
      sourceName: 'Instagram Business Profile',
      isUsable: true,
      customPitch: 'Hello Dr. Pendleton & Team, love the patient smile transformations highlighted on your Instagram page! As a Full Stack Web Architect, I create sleek, patient-friendly consultation booking web apps for London healthcare clinics. Would you be open to exploring a dedicated portal for Mayfair Dental?',
      status: 'not_contacted',
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Lead 4: Pipeline B (UK - AI & Software Opportunities) [ALREADY EMAILED + GMAIL SENT LINK]
    const b4Id = 'biz-004-finflow-ai';
    const b4: BusinessEntity = {
      id: b4Id,
      organizationId: 'org-demo-001',
      name: 'FinFlow Compliance AI',
      normalizedName: normalizeBusinessName('FinFlow Compliance AI'),
      domain: 'finflow-compliance.co.uk',
      normalizedDomain: 'finflow-compliance.co.uk',
      country: 'UK',
      region: 'England',
      city: 'London',
      postalCode: 'EC2V 7AY',
      address: '100 Cheapside, London EC2V 7AY',
      phone: '+44 20 7946 0881',
      industry: 'FinTech & Regulatory Compliance SaaS',
      companyType: 'B2B SaaS Scaleup',
      employeeCountRange: '25-50',
      annualRevenueRange: '£3M - £7M',
      pipelineType: 'ai_software_opportunities',
      qualificationStatus: 'contacted',
      sourceProvider: 'uk_tech_registry',
      sourceIdentifier: 'finflow_uk',
      isArchived: false,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.businesses.set(b4Id, b4);

    this.contacts.set(b4Id, [
      {
        id: 'c-004',
        businessId: b4Id,
        fullName: 'Sarah Jenkins',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        title: 'Head of AI Engineering',
        email: 'sarah.jenkins@finflow-compliance.co.uk',
        normalizedEmail: 'sarah.jenkins@finflow-compliance.co.uk',
        phone: '+44 20 7946 0881',
        linkedinUrl: 'https://linkedin.com/in/sarah-jenkins-fintech-ai',
        confidence: 0.96,
        verificationStatus: 'verified',
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    this.scores.set(b4Id, {
      id: 'sc-004',
      businessId: b4Id,
      overallScore: 94,
      activityScore: 92,
      serviceFitScore: 96,
      websiteOpportunityScore: 5,
      aiOpportunityScore: 98,
      contactQualityScore: 95,
      confidenceScore: 0.97,
      reasoning: 'Prime candidate for AI automation & RAG architectures. Company published public requirements for automated FCA compliance parsing with Python LLM microservices.',
      scoreBreakdown: {
        aiRelevance: 'Exceptional',
        techSignals: ['python', 'llm', 'rag', 'fastapi', 'fca_compliance'],
      },
      scoredAt: new Date().toISOString(),
    });

    // Seed Sent Email Draft with real Gmail reference
    const draft4Id = 'draft-004-finflow-sent';
    const sentMsgId = '1928374a5b6c7d8e';
    this.drafts.set(draft4Id, {
      id: draft4Id,
      businessId: b4Id,
      contactId: 'c-004',
      campaignId: campId,
      strategy: 'rag_systems',
      subjectLines: [
        'Scaling FCA Compliance Intelligence for FinFlow Compliance AI',
        'Python RAG microservices for FinFlow Compliance AI',
        'AI Automation & LLM architecture for Sarah Jenkins',
      ],
      selectedSubject: 'Scaling FCA Compliance Intelligence for FinFlow Compliance AI',
      emailBody: `Hi Sarah,

Noticed FinFlow's recent technical expansion in automated regulatory reporting across UK financial institutions.

Parsing dense regulatory handbooks with standard LLM approaches frequently encounters hallucination traps and vector retrieval latency. As a Full Stack AI Developer & Automation Architect, I build deterministic RAG systems with strict source grounding and high-throughput Python/FastAPI microservices.

Are you available for a brief 15-minute technical exchange this Thursday at 14:00 GMT?

Best regards,
Zia Ul Din
Full Stack AI Developer & Automation Architect
ziauldin371@gmail.com`,
      recipientEmail: 'sarah.jenkins@finflow-compliance.co.uk',
      callToAction: 'Are you available for a brief 15-minute technical exchange this Thursday at 14:00 GMT?',
      serviceOffer: 'Deterministic RAG pipelines, FastAPI microservices, and LLM evaluation architectures for financial regulations.',
      researchSummary: 'Verified active hiring for Senior Python LLM Engineer and expansion into automated FCA compliance document extraction.',
      observations: [
        {
          fact: 'Actively scaling AI engineering team for automated regulatory handbook extraction.',
          source: 'LinkedIn Technical Jobs UK',
          isVerified: true,
        },
      ],
      rationale: 'Perfect alignment with Zia Ul Din\'s Python and LLM development capabilities.',
      warnings: [],
      confidenceRating: 0.98,
      version: 1,
      status: 'sent',
      approvedBy: 'ziauldin371@gmail.com',
      approvedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      gmailMessageId: sentMsgId,
      gmailThreadId: '1928374a5b6c7d8e_th',
      gmailUrl: `https://mail.google.com/mail/u/0/#sent/${sentMsgId}`,
      sentAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      deliveryStatus: 'delivered',
      createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    });

    // Alternative channels for FinFlow AI (For "Email Sent + Other Channels" view!)
    const ch4aId = 'ch-004-finflow-linkedin';
    this.alternativeChannels.set(ch4aId, {
      id: ch4aId,
      businessId: b4Id,
      businessName: b4.name,
      country: 'UK',
      platform: 'linkedin',
      profileUrl: 'https://linkedin.com/in/sarah-jenkins-fintech-ai',
      handleOrIdentifier: 'sarah-jenkins-fintech-ai',
      sourceName: 'LinkedIn Profile',
      isUsable: true,
      customPitch: 'Hi Sarah — dropped a brief email to your inbox regarding FinFlow\'s automated FCA regulatory processing. Reaching out here on LinkedIn as well in case you prefer connecting here. Would love to share our architecture notes on hallucination-resistant RAG for financial compliance!',
      status: 'not_contacted',
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const ch4bId = 'ch-004-finflow-twitter';
    this.alternativeChannels.set(ch4bId, {
      id: ch4bId,
      businessId: b4Id,
      businessName: b4.name,
      country: 'UK',
      platform: 'twitter',
      profileUrl: 'https://x.com/FinFlowAI',
      handleOrIdentifier: '@FinFlowAI',
      sourceName: 'Official X Profile',
      isUsable: true,
      customPitch: 'Hi @FinFlowAI team, following your recent work on automated compliance intelligence. Sent Sarah Jenkins an email regarding specialized Python RAG architectures. Happy to connect!',
      status: 'not_contacted',
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Lead 5: Pipeline A (US - NO EMAIL AVAILABLE! Alternative Channels Only)
    const b5Id = 'biz-005-blueridge-fab';
    const b5: BusinessEntity = {
      id: b5Id,
      organizationId: 'org-demo-001',
      name: 'Blue Ridge Precision Fabrication LLC',
      normalizedName: normalizeBusinessName('Blue Ridge Precision Fabrication LLC'),
      domain: null,
      normalizedDomain: null,
      country: 'US',
      region: 'Colorado',
      city: 'Denver',
      postalCode: '80204',
      address: '1100 W 5th Ave, Denver, CO 80204',
      phone: '+1-303-555-0177',
      industry: 'Custom CNC Machining & Industrial Fabrication',
      companyType: 'Industrial LLC',
      employeeCountRange: '15-30',
      annualRevenueRange: '$2M - $4M',
      pipelineType: 'website_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'google_places',
      sourceIdentifier: 'gplace_blueridge_denver',
      isArchived: false,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.businesses.set(b5Id, b5);

    this.evidence.set(b5Id, [
      {
        id: 'ev-005-a',
        businessId: b5Id,
        sourceName: 'Google Business Profile Reviews',
        sourceUrl: 'https://maps.google.com/?cid=998877665544',
        observationTime: new Date(Date.now() - 1 * 86400000).toISOString(),
        evidenceType: 'customer_review_velocity',
        summary: '84 verified 5-star customer reviews across Colorado construction contractors; high active commercial machining volume.',
        isFactual: true,
        confidence: 0.95,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
    ]);

    this.websiteChecks.set(b5Id, {
      id: 'wc-005',
      businessId: b5Id,
      domain: null,
      status: 'apparently_absent',
      isPrivateIp: false,
      checkedAt: new Date().toISOString(),
      errorDetails: 'No official domain registered. Relies exclusively on Google Business & Formstack contact form.',
    });

    // Notice: NO EMAIL CONTACT! Phone and contact form only.
    this.contacts.set(b5Id, [
      {
        id: 'c-005',
        businessId: b5Id,
        fullName: 'Blue Ridge Estimating Desk',
        phone: '+1-303-555-0177',
        confidence: 0.85,
        verificationStatus: 'verified',
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    this.scores.set(b5Id, {
      id: 'sc-005',
      businessId: b5Id,
      overallScore: 82,
      activityScore: 90,
      serviceFitScore: 85,
      websiteOpportunityScore: 95,
      aiOpportunityScore: 20,
      contactQualityScore: 50, // lower because no email
      confidenceScore: 0.90,
      reasoning: 'Strong candidate for Pipeline A website development. High transactional volume and pristine local reputation in Denver, but no website exists. No public email found, so routed to alternative outreach channels (Contact Form & LinkedIn).',
      scoreBreakdown: {
        noEmailAvailable: true,
        alternativeChannelsFound: 2,
      },
      scoredAt: new Date().toISOString(),
    });

    // Alternative channels for Blue Ridge (Form & LinkedIn)
    const ch5aId = 'ch-005-blueridge-form';
    this.alternativeChannels.set(ch5aId, {
      id: ch5aId,
      businessId: b5Id,
      businessName: b5.name,
      country: 'US',
      platform: 'contact_form',
      profileUrl: 'https://blueridge-precision.formstack.com/forms/rfq_quote',
      handleOrIdentifier: 'RFQ Quote Intake Form',
      sourceName: 'Formstack Hosted Portal',
      isUsable: true,
      customPitch: 'Hi Blue Ridge Fabrication Team — Noticed your outstanding 5-star reputation for CNC machining in Denver. I develop modern, mobile-friendly web portals with automated CAD file upload and instant RFQ estimators. Would you be interested in upgrading from third-party forms to an official branded web platform that captures high-value fabrication contracts?',
      status: 'not_contacted',
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const ch5bId = 'ch-005-blueridge-linkedin';
    this.alternativeChannels.set(ch5bId, {
      id: ch5bId,
      businessId: b5Id,
      businessName: b5.name,
      country: 'US',
      platform: 'linkedin',
      profileUrl: 'https://linkedin.com/company/blue-ridge-precision-fab',
      handleOrIdentifier: 'blue-ridge-precision-fab',
      sourceName: 'LinkedIn Directory',
      isUsable: true,
      customPitch: 'Hi Blue Ridge Precision team — impressed by your industrial machining work in Colorado. Reaching out to see if you\'ve considered building an official online portal to showcase your CNC capabilities and streamline customer intake. Would love to share some relevant web architectures we\'ve built for industrial suppliers.',
      status: 'not_contacted',
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Lead 6: Pipeline B (Canada - AI Automation & Data Science)
    const b6Id = 'biz-006-nordic-dispatch';
    const b6: BusinessEntity = {
      id: b6Id,
      organizationId: 'org-demo-001',
      name: 'Nordic Autonomous Dispatch Inc.',
      normalizedName: normalizeBusinessName('Nordic Autonomous Dispatch Inc.'),
      domain: 'nordicdispatch.ca',
      normalizedDomain: 'nordicdispatch.ca',
      country: 'CA',
      region: 'Ontario',
      city: 'Toronto',
      postalCode: 'M5J 2H7',
      address: '200 Bay St, Toronto, ON M5J 2H7',
      phone: '+1-416-555-0149',
      industry: 'Smart Logistics & Fleet AI',
      companyType: 'Canadian Corporation',
      employeeCountRange: '20-45',
      annualRevenueRange: '$3M - $6M',
      pipelineType: 'ai_software_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'canada_corp_db',
      sourceIdentifier: 'nordic_ca_01',
      isArchived: false,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.businesses.set(b6Id, b6);

    this.contacts.set(b6Id, [
      {
        id: 'c-006',
        businessId: b6Id,
        fullName: 'Elena Rostova',
        firstName: 'Elena',
        lastName: 'Rostova',
        title: 'Director of Machine Learning',
        email: 'elena.rostova@nordicdispatch.ca',
        normalizedEmail: 'elena.rostova@nordicdispatch.ca',
        phone: '+1-416-555-0149',
        linkedinUrl: 'https://linkedin.com/in/elena-rostova-ml',
        confidence: 0.94,
        verificationStatus: 'verified',
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    this.scores.set(b6Id, {
      id: 'sc-006',
      businessId: b6Id,
      overallScore: 91,
      activityScore: 89,
      serviceFitScore: 95,
      websiteOpportunityScore: 10,
      aiOpportunityScore: 94,
      contactQualityScore: 94,
      confidenceScore: 0.95,
      reasoning: 'Strong fit for Python data pipelines and AI agent engineering. Fleet dispatch optimization requires reliable real-time ingestion and LLM routing assistants.',
      scoreBreakdown: {
        fleetAiRelevance: 'High',
        pythonPipelineNeeded: true,
      },
      scoredAt: new Date().toISOString(),
    });

    const ch6Id = 'ch-006-nordic-linkedin';
    this.alternativeChannels.set(ch6Id, {
      id: ch6Id,
      businessId: b6Id,
      businessName: b6.name,
      country: 'CA',
      platform: 'linkedin',
      profileUrl: 'https://linkedin.com/in/elena-rostova-ml',
      handleOrIdentifier: 'elena-rostova-ml',
      sourceName: 'LinkedIn Profile',
      isUsable: true,
      customPitch: 'Hi Elena — saw Nordic\'s smart fleet dispatch initiatives in Ontario. As an AI Automation Architect and Python Developer, I engineer high-velocity data pipelines and agentic workflows that optimize fleet scheduling. Would love to connect and exchange technical ideas!',
      status: 'not_contacted',
      lastCheckedAt: new Date().toISOString(),
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

    // Label all initial sandbox seed records
    for (const b of Array.from(this.businesses.values())) {
      b.isSandboxData = true;
      (b as any).isDemo = true;
    }
    for (const d of Array.from(this.drafts.values())) {
      (d as any).isSandboxData = true;
      (d as any).isDemo = true;
    }
    for (const ch of Array.from(this.alternativeChannels.values())) {
      (ch as any).isSandboxData = true;
      (ch as any).isDemo = true;
    }
    for (const s of Array.from(this.suppression.values())) {
      (s as any).isSandboxData = true;
      (s as any).isDemo = true;
    }
  }

  public seedDemoData(force = false): void {
    this.demoModeActive = true;
    if (process.env.NODE_ENV === 'production' && !force) return;
    this.seedInitialData(force);
    this.persistState();
  }

  public clearDemoData(): void {
    this.demoModeActive = false;
    for (const [id, b] of Array.from(this.businesses.entries())) {
      if (isDemoOrSandboxRecord(b)) {
        this.businesses.delete(id);
      }
    }
    for (const [id, d] of Array.from(this.drafts.entries())) {
      if (isDemoOrSandboxRecord(d)) {
        this.drafts.delete(id);
      }
    }
    for (const [id, ch] of Array.from(this.alternativeChannels.entries())) {
      if (isDemoOrSandboxRecord(ch)) {
        this.alternativeChannels.delete(id);
      }
    }
    for (const [id, s] of Array.from(this.suppression.entries())) {
      if (isDemoOrSandboxRecord(s)) {
        this.suppression.delete(id);
      }
    }
    this.persistState();
  }

  public hasDemoData(): boolean {
    if (process.env.NODE_ENV === 'production') {
      return this.demoModeActive;
    }
    return Array.from(this.businesses.values()).some(b => isDemoOrSandboxRecord(b));
  }

  // --- Businesses ---
  public getBusinesses(filter?: {
    pipeline?: PipelineType | 'all';
    search?: string;
    qualificationStatus?: string;
    country?: string;
    limit?: number;
    offset?: number;
    includeDemo?: boolean;
  }): { businesses: BusinessEntity[]; total: number } {
    let list = Array.from(this.businesses.values());

    if (!filter?.includeDemo) {
      list = list.filter(b => !isDemoOrSandboxRecord(b));
    }

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
    this.persistState();
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
  public getDrafts(filter?: { status?: string; campaignId?: string; limit?: number; offset?: number; includeDemo?: boolean }): EmailDraftEntity[] {
    let list = Array.from(this.drafts.values());
    if (!filter?.includeDemo) {
      list = list.filter(d => !isDemoOrSandboxRecord(d));
    }
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
    this.persistState();
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
    this.persistState();
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
    this.persistState();
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
    this.persistState();
  }

  public updateJob(id: string, updates: Partial<AutomationJobEntity>): AutomationJobEntity | null {
    const j = this.jobs.get(id);
    if (!j) return null;
    const updated = { ...j, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    this.persistState();
    return updated;
  }

  // --- Operating Modes & Safety Switches ---
  public getOperatingMode(): OperatingMode {
    return this.operatingMode;
  }

  public setOperatingMode(mode: OperatingMode): void {
    this.operatingMode = mode;
    this.persistState();
  }

  public isAutomationPaused(): boolean {
    return this.automationPaused;
  }

  public setAutomationPaused(paused: boolean): void {
    this.automationPaused = paused;
    this.persistState();
  }

  // --- Alternative Outreach Channels ---
  public saveAlternativeChannel(channel: AlternativeChannelEntity): void {
    this.alternativeChannels.set(channel.id, channel);
    this.persistState();
  }

  public getAlternativeChannels(businessId?: string): AlternativeChannelEntity[] {
    const all = Array.from(this.alternativeChannels.values());
    if (businessId) {
      return all.filter(c => c.businessId === businessId);
    }
    return all;
  }

  public getAlternativeChannelById(id: string): AlternativeChannelEntity | null {
    return this.alternativeChannels.get(id) || null;
  }

  public updateAlternativeChannelStatus(
    channelId: string, 
    status?: AlternativeChannelStatus, 
    reminderDate?: string | null, 
    notes?: string | null,
    customPitch?: string
  ): boolean {
    const ch = this.alternativeChannels.get(channelId);
    if (!ch) return false;
    if (status) ch.status = status;
    if (reminderDate !== undefined) ch.reminderDate = reminderDate;
    if (notes !== undefined) ch.notes = notes;
    if (customPitch !== undefined) ch.customPitch = customPitch;
    ch.updatedAt = new Date().toISOString();
    this.alternativeChannels.set(channelId, ch);
    this.persistState();
    return true;
  }

  // --- Specialized Dashboard Queries ---

  /**
   * 1. Worldwide Leads with multi-dimensional filtering
   */
  public getWorldwideLeads(filters?: {
    country?: string;
    pipeline?: string;
    status?: string;
    minScore?: number;
    hasEmail?: boolean;
    industry?: string;
    search?: string;
    includeDemo?: boolean;
  }): BusinessEntity[] {
    let result = Array.from(this.businesses.values());

    if (filters?.includeDemo === false) {
      result = result.filter(b => !isDemoOrSandboxRecord(b));
    }

    if (filters?.country && filters.country !== 'all') {
      result = result.filter(b => b.country.toLowerCase() === filters.country?.toLowerCase());
    }
    if (filters?.pipeline && filters.pipeline !== 'all') {
      result = result.filter(b => b.pipelineType === filters.pipeline);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter(b => b.qualificationStatus === filters.status);
    }
    if (filters?.industry && filters.industry !== 'all') {
      result = result.filter(b => b.industry?.toLowerCase().includes(filters.industry!.toLowerCase()));
    }
    if (filters?.minScore !== undefined) {
      result = result.filter(b => {
        const score = this.scores.get(b.id)?.overallScore || 0;
        return score >= filters.minScore!;
      });
    }
    if (filters?.hasEmail !== undefined) {
      result = result.filter(b => {
        const contacts = this.contacts.get(b.id) || [];
        const has = contacts.some(c => c.email && c.email.includes('@'));
        return filters.hasEmail ? has : !has;
      });
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(b => 
        b.name.toLowerCase().includes(q) || 
        b.city?.toLowerCase().includes(q) || 
        b.domain?.toLowerCase().includes(q)
      );
    }

    return result.map(b => ({
      ...b,
      contacts: this.contacts.get(b.id) || [],
      evidence: this.evidence.get(b.id) || [],
      websiteCheck: this.websiteChecks.get(b.id) || null,
      score: this.scores.get(b.id) || null,
      alternativeChannels: this.getAlternativeChannels(b.id),
    }));
  }

  /**
   * 2. Ready for Email: Contacts meeting 100% of sending criteria
   */
  public getReadyForEmailLeads(options?: { includeDemo?: boolean }): Array<{
    business: BusinessEntity;
    contact: ContactEntity;
    score: LeadScoreEntity;
    draft?: EmailDraftEntity | null;
    reasons: string[];
  }> {
    const list: Array<any> = [];
    let businesses = Array.from(this.businesses.values()).filter(b => b.qualificationStatus === 'qualified');
    if (options?.includeDemo === false) {
      businesses = businesses.filter(b => !isDemoOrSandboxRecord(b));
    }

    for (const b of businesses) {
      const contacts = this.contacts.get(b.id) || [];
      const primaryContact = contacts.find(c => c.email && c.email.includes('@')) || contacts[0];
      if (!primaryContact?.email) continue;

      if (this.isSuppressed(primaryContact.email)) continue;

      const score = this.scores.get(b.id);
      if (!score || score.overallScore < 60) continue;

      const draft = Array.from(this.drafts.values()).find(d => d.businessId === b.id);

      const reasons: string[] = [
        `Verified commercial activity in ${b.country || 'Target Market'}`,
        `Overall ICP score ${score.overallScore}/100 meets high-intent threshold`,
        `Verified contact email (${primaryContact.email}) is active and unsuppressed`,
        b.pipelineType === 'website_opportunities'
          ? 'Digital audit shows absent or broken official website'
          : 'Verified technical hiring/scaling signals match AI & Python engineering services',
      ];

      list.push({
        business: {
          ...b,
          websiteCheck: this.websiteChecks.get(b.id) || null,
          evidence: this.evidence.get(b.id) || [],
        },
        contact: primaryContact,
        score,
        draft: draft || null,
        reasons,
      });
    }

    return list;
  }

  /**
   * 3. Sent Emails: Message history with Gmail Sent links
   */
  public getSentEmails(options?: { includeDemo?: boolean }): Array<EmailDraftEntity & { businessName: string; country: string; domain?: string | null }> {
    let sentDrafts = Array.from(this.drafts.values()).filter(d => d.status === 'sent');
    if (options?.includeDemo === false) {
      const isGmailConnected = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);
      sentDrafts = sentDrafts.filter(d => isRealVerifiedSentEmail(d, isGmailConnected));
    }
    return sentDrafts.map(d => {
      const b = this.businesses.get(d.businessId);
      const contacts = this.contacts.get(d.businessId) || [];
      return {
        ...d,
        recipientEmail: d.recipientEmail || contacts[0]?.email || 'prospect@business.internal',
        businessName: b?.name || 'Unknown Business',
        country: b?.country || 'US',
        domain: b?.domain || null,
      };
    });
  }

  /**
   * 4. Other Outreach Opportunities: Businesses with professional channels beyond email
   */
  public getOtherOutreachOpportunities(options?: { includeDemo?: boolean }): Array<{
    business: BusinessEntity;
    channels: AlternativeChannelEntity[];
  }> {
    const result: Array<any> = [];
    let list = Array.from(this.businesses.values());
    if (options?.includeDemo === false) {
      list = list.filter(b => !isDemoOrSandboxRecord(b));
    }
    for (const b of list) {
      const channels = this.getAlternativeChannels(b.id);
      if (channels.length > 0) {
        result.push({
          business: {
            ...b,
            score: this.scores.get(b.id) || null,
            contacts: this.contacts.get(b.id) || [],
          },
          channels,
        });
      }
    }
    return result;
  }

  /**
   * 5. Email Sent + Other Channels: Multi-touch prospective clients
   */
  public getEmailSentPlusOtherChannels(options?: { includeDemo?: boolean }): Array<{
    business: BusinessEntity;
    draft: EmailDraftEntity;
    channels: AlternativeChannelEntity[];
  }> {
    const result: Array<any> = [];
    let sentDrafts = Array.from(this.drafts.values()).filter(d => d.status === 'sent');
    if (options?.includeDemo === false) {
      const isGmailConnected = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);
      sentDrafts = sentDrafts.filter(d => isRealVerifiedSentEmail(d, isGmailConnected));
    }

    for (const d of sentDrafts) {
      const b = this.businesses.get(d.businessId);
      if (!b) continue;
      const channels = this.getAlternativeChannels(b.id);
      if (channels.length > 0) {
        result.push({
          business: {
            ...b,
            score: this.scores.get(b.id) || null,
          },
          draft: d,
          channels,
        });
      }
    }
    return result;
  }

  /**
   * 6. No Email Available: Businesses without usable business email
   */
  public getNoEmailBusinesses(options?: { includeDemo?: boolean }): Array<{
    business: BusinessEntity;
    channels: AlternativeChannelEntity[];
  }> {
    const result: Array<any> = [];
    let list = Array.from(this.businesses.values());
    if (options?.includeDemo === false) {
      list = list.filter(b => !isDemoOrSandboxRecord(b));
    }
    for (const b of list) {
      const contacts = this.contacts.get(b.id) || [];
      const hasEmail = contacts.some(c => c.email && c.email.includes('@'));
      if (!hasEmail) {
        result.push({
          business: {
            ...b,
            score: this.scores.get(b.id) || null,
          },
          channels: this.getAlternativeChannels(b.id),
        });
      }
    }
    return result;
  }

  // --- Cross-Channel Locking & Coordination (Part D4) ---
  public lockAllChannelsForBusiness(businessId: string, reason: string): void {
    for (const [chId, channel] of Array.from(this.alternativeChannels.entries())) {
      if (channel.businessId === businessId) {
        channel.isLockedOptOut = true;
        channel.status = 'not_applicable';
        channel.notes = `[LOCKED - DO NOT CONTACT: ${reason}] ${channel.notes || ''}`.trim();
        this.alternativeChannels.set(chId, channel);
      }
    }

    // Suppress business domain if exists
    const b = this.businesses.get(businessId);
    if (b && b.domain) {
      this.addSuppression({
        id: `sup_dom_${Date.now()}`,
        organizationId: 'org-demo-001',
        type: 'domain',
        value: b.domain,
        reason: 'unsubscribe',
        notes: reason,
        createdAt: new Date().toISOString(),
      });
    }
    const contacts = this.contacts.get(businessId) || [];
    for (const c of contacts) {
      if (c.email) {
        this.addSuppression({
          id: `sup_em_${Date.now()}_${Math.random()}`,
          organizationId: 'org-demo-001',
          type: 'email',
          value: c.email,
          reason: 'unsubscribe',
          notes: reason,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  public recordChannelContact(channelId: string, contactedAt: string = new Date().toISOString()): void {
    const channel = this.alternativeChannels.get(channelId);
    if (!channel) return;

    channel.status = 'manually_contacted';
    channel.contactedAt = contactedAt;

    // Enforce 3-day quiet period (72 hours) across all other channels for this business
    const nextEligible = new Date(new Date(contactedAt).getTime() + 72 * 60 * 60 * 1000).toISOString();
    channel.nextTouchEligibleAt = nextEligible;
    this.alternativeChannels.set(channelId, channel);

    for (const [otherId, otherCh] of Array.from(this.alternativeChannels.entries())) {
      if (otherCh.businessId === channel.businessId && otherId !== channelId) {
        otherCh.nextTouchEligibleAt = nextEligible;
        this.alternativeChannels.set(otherId, otherCh);
      }
    }
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

  // --- Scheduler Checkpoints (Bounded Batch Resumption) ---
  public saveCheckpoint(taskName: string, cursorData: any, itemsRemaining?: number): void {
    this.checkpoints.set(taskName, {
      taskName,
      cursorData,
      itemsRemaining: itemsRemaining || 0,
      updatedAt: new Date().toISOString(),
    });
    this.persistState();
  }

  public getCheckpoint(taskName: string): any | null {
    const cp = this.checkpoints.get(taskName);
    if (!cp) return null;
    return {
      ...cp,
      cursor_data: cp.cursorData,
    };
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
    this.persistState();
  }

  public getSchedulerRuns(): any[] {
    return this.schedulerRuns;
  }

  public getLastSchedulerRun(): any | null {
    return this.schedulerRuns.length > 0 ? this.schedulerRuns[0] : null;
  }

  // --- Analytics & Stats ---
  public getPlatformStats(options?: { includeDemo?: boolean }) {
    const isGmailConnected = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);
    const homeStats = computeHomeStats({
      businesses: Array.from(this.businesses.values()),
      drafts: Array.from(this.drafts.values()),
      isGmailConnected,
      showDemo: options?.includeDemo ?? false,
    });

    let allBiz = Array.from(this.businesses.values());
    let drafts = Array.from(this.drafts.values());
    if (!options?.includeDemo) {
      allBiz = allBiz.filter(b => !isDemoOrSandboxRecord(b));
      drafts = drafts.filter(d => !isDemoOrSandboxRecord(d));
    }
    const pipeA = allBiz.filter(b => b.pipelineType === 'website_opportunities');
    const pipeB = allBiz.filter(b => b.pipelineType === 'ai_software_opportunities');
    const approvedDrafts = drafts.filter(d => d.status === 'approved');

    return {
      totalBusinesses: homeStats.totalBusinesses,
      pipelineAOpportunities: pipeA.length,
      pipelineBOpportunities: pipeB.length,
      qualifiedTotal: homeStats.qualifiedTotal,
      totalDrafts: drafts.length,
      approvedDrafts: approvedDrafts.length,
      sentCount: homeStats.sentCount,
      confirmedDeliveries: homeStats.confirmedDeliveries,
      failuresCount: drafts.filter(d => d.deliveryStatus === 'failed').length,
      repliesCount: homeStats.repliesCount,
      suppressionCount: this.suppression.size,
      eligibleEmailContacts: homeStats.eligibleEmailContacts,
      alternativeChannelsCount: homeStats.manualOutreachCount,
      otherOutreachCount: homeStats.manualOutreachCount,
      emailSentPlusChannelsCount: 0,
      noEmailCount: homeStats.manualOutreachCount,
      activeCampaigns: Array.from(this.campaigns.values()).filter(c => c.status === 'running' || c.status === 'scheduled').length,
      operatingMode: this.operatingMode,
      automationPaused: this.automationPaused,
      lastSchedulerRun: this.getLastSchedulerRun(),
      timelineSentences: homeStats.timelineSentences,
    };
  }

  // ==============================================================================
  // Platform Registry & Acquisition Engine Implementations
  // ==============================================================================

  private seedPlatforms(): void {
    this.platforms.clear();
    try {
      const seedPath = path.join(process.cwd(), 'src', 'data', 'seed-platforms.json');
      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, 'utf8');
        const list: PlatformEntity[] = JSON.parse(raw);
        for (const p of list) {
          this.platforms.set(p.id, p);
          if (p.category === 'vetted_network' || p.category === 'expert_network') {
            if (!this.vettedApplications.has(p.id)) {
              this.vettedApplications.set(p.id, {
                id: `app_${p.id}`,
                platformId: p.id,
                platformName: p.name,
                status: 'not_started',
                readinessScore: 65,
                checklist: [
                  { id: 'cv', label: 'Updated AI/ML Specialist Resume/CV', completed: true },
                  { id: 'github', label: 'Polished GitHub with 2+ AI repositories', completed: true },
                  { id: 'case_studies', label: '2-3 Production Case Studies with metrics', completed: false },
                  { id: 'demo_video', label: '3-minute Loom demo of working RAG/ML prototype', completed: false },
                  { id: 'screening_test', label: 'Technical screening / code assessment preparation', completed: false },
                ],
                hasCv: true,
                hasGithub: true,
                caseStudiesCount: 2,
                hasDemoVideo: false,
                appliedDate: null,
                nextActionDate: null,
                interviewNotes: null,
                pakistanCheck: {
                  onboardingChecked: false,
                  payoutMethod: 'Payoneer / Wise / Wire',
                  withdrawalFeePercent: 2.0,
                  taxObligationsNoted: false,
                  contractorEligibility: 'needs_check',
                  notes: 'Verify current Pakistani bank wire & foreign remittance tax rules before applying',
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load seed-platforms.json:', e);
    }

    if (this.leadSourceConfigs.size === 0) {
      const defaultSources: Array<{ name: string; budget: number }> = [
        { name: 'hunter', budget: 100 },
        { name: 'apollo', budget: 250 },
        { name: 'snov', budget: 150 },
        { name: 'crunchbase', budget: 50 },
      ];
      for (const ds of defaultSources) {
        this.leadSourceConfigs.set(ds.name, {
          id: `cfg_${ds.name}`,
          sourceName: ds.name,
          monthlyCreditBudget: ds.budget,
          creditsUsedThisMonth: 0,
          status: 'not_configured',
          lastTestedAt: null,
          apiKeyConfigured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  public getPlatforms(filters?: { 
    category?: string; 
    priority?: string; 
    pitchMode?: string; 
    countryEligibility?: string; 
    myAccountStatus?: string; 
    search?: string 
  }): PlatformEntity[] {
    let list = Array.from(this.platforms.values());
    if (filters?.category && filters.category !== 'all') {
      list = list.filter(p => p.category === filters.category);
    }
    if (filters?.priority && filters.priority !== 'all') {
      list = list.filter(p => p.priority === filters.priority);
    }
    if (filters?.pitchMode && filters.pitchMode !== 'all') {
      list = list.filter(p => p.pitchMode === filters.pitchMode);
    }
    if (filters?.countryEligibility && filters.countryEligibility !== 'all') {
      list = list.filter(p => p.countryEligibilityStatus === filters.countryEligibility);
    }
    if (filters?.myAccountStatus && filters.myAccountStatus !== 'all') {
      list = list.filter(p => p.myAccountStatus === filters.myAccountStatus);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.howToGetClients.toLowerCase().includes(q) || 
        p.aiMlRelevance.toLowerCase().includes(q)
      );
    }
    return list;
  }

  public getPlatformById(id: string): PlatformEntity | null {
    return this.platforms.get(id) || null;
  }

  public savePlatform(platform: PlatformEntity): void {
    this.platforms.set(platform.id, platform);
    this.persistState();
  }

  public updatePlatform(id: string, updates: Partial<PlatformEntity>): PlatformEntity | null {
    const existing = this.platforms.get(id);
    if (!existing) return null;
    const updated: PlatformEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.platforms.set(id, updated);
    this.persistState();
    return updated;
  }

  public verifyPlatformTerms(id: string, verifiedAt?: string): PlatformEntity | null {
    return this.updatePlatform(id, {
      lastVerified: verifiedAt || new Date().toISOString(),
      notes: 'Terms verified by operator',
    });
  }

  // Vetted Applications Tracker (Group B)
  public getVettedApplications(): VettedApplicationEntity[] {
    return Array.from(this.vettedApplications.values());
  }

  public getVettedApplicationById(id: string): VettedApplicationEntity | null {
    return this.vettedApplications.get(id) || null;
  }

  public saveVettedApplication(app: VettedApplicationEntity): void {
    this.vettedApplications.set(app.platformId, app);
    this.persistState();
  }

  public updateVettedApplication(id: string, updates: Partial<VettedApplicationEntity>): VettedApplicationEntity | null {
    let existing = this.vettedApplications.get(id);
    if (!existing) {
      for (const a of Array.from(this.vettedApplications.values())) {
        if (a.id === id) {
          existing = a;
          break;
        }
      }
    }
    if (!existing) return null;
    const updated: VettedApplicationEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.vettedApplications.set(existing.platformId, updated);
    this.persistState();
    return updated;
  }

  // Lead Source Configs (Group C)
  public getLeadSourceConfigs(): LeadSourceConfigEntity[] {
    return Array.from(this.leadSourceConfigs.values());
  }

  public saveLeadSourceConfig(config: LeadSourceConfigEntity): void {
    this.leadSourceConfigs.set(config.sourceName, config);
    this.persistState();
  }

  public recordLeadSourceUsage(sourceName: string, creditsUsed: number = 1): void {
    const existing = this.leadSourceConfigs.get(sourceName);
    if (existing) {
      existing.creditsUsedThisMonth += creditsUsed;
      existing.updatedAt = new Date().toISOString();
      this.persistState();
    }
  }

  // Platform Footprints ("Where else can I reach them?")
  public getFootprintsForBusiness(businessId: string): PlatformFootprintCandidate[] {
    return this.platformFootprints.get(businessId) || [];
  }

  public saveFootprint(footprint: PlatformFootprintCandidate): void {
    const list = this.platformFootprints.get(footprint.businessId) || [];
    const idx = list.findIndex(f => f.platform === footprint.platform && f.profileUrl === footprint.profileUrl);
    if (idx >= 0) {
      list[idx] = footprint;
    } else {
      list.push(footprint);
    }
    this.platformFootprints.set(footprint.businessId, list);
    this.persistState();
  }

  public deleteFootprint(id: string): void {
    for (const [bizId, list] of Array.from(this.platformFootprints.entries())) {
      const filtered = list.filter((f: PlatformFootprintCandidate) => f.id !== id);
      if (filtered.length !== list.length) {
        this.platformFootprints.set(bizId, filtered);
        this.persistState();
        break;
      }
    }
  }

  // Marketplace Hot Requests (Group A)
  public getHotRequests(filters?: { platform?: string; minFit?: number; status?: string }): MarketplaceHotRequestEntity[] {
    let list = Array.from(this.hotRequests.values());
    if (filters?.platform && filters.platform !== 'all') {
      list = list.filter(r => r.platform.toLowerCase() === filters.platform!.toLowerCase());
    }
    if (typeof filters?.minFit === 'number') {
      list = list.filter(r => r.fitScore >= filters.minFit!);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter(r => r.status === filters.status);
    }
    return list.sort((a, b) => b.fitScore - a.fitScore);
  }

  public saveHotRequest(request: MarketplaceHotRequestEntity): void {
    this.hotRequests.set(request.id, request);
    this.persistState();
  }

  public updateHotRequestStatus(id: string, status: 'new' | 'proposal_copied' | 'submitted' | 'declined'): boolean {
    const req = this.hotRequests.get(id);
    if (!req) return false;
    req.status = status;
    this.persistState();
    return true;
  }

  // Platform Spend Logs
  public getPlatformSpendLogs(platformId?: string): PlatformSpendLogEntity[] {
    if (platformId) {
      return this.platformSpendLogs.filter(s => s.platformId === platformId);
    }
    return [...this.platformSpendLogs];
  }

  public recordPlatformSpend(spend: PlatformSpendLogEntity): void {
    this.platformSpendLogs.push(spend);
    this.persistState();
  }
  // Platform Trackers & Targets
  public getPlatformTrackers(): Record<string, PlatformTrackerEntity> {
    const res: Record<string, PlatformTrackerEntity> = {};
    for (const [k, v] of Array.from(this.platformTrackers.entries())) {
      res[k] = v;
    }
    return res;
  }

  public savePlatformTracker(tracker: Partial<PlatformTrackerEntity> & { platformId: string }): PlatformTrackerEntity {
    const existing = this.platformTrackers.get(tracker.platformId);
    const updated: PlatformTrackerEntity = {
      id: existing?.id || `trk_${tracker.platformId}`,
      platformId: tracker.platformId,
      status: tracker.status || existing?.status || 'not_started',
      myProfileUrl: tracker.myProfileUrl !== undefined ? tracker.myProfileUrl : (existing?.myProfileUrl || null),
      notes: tracker.notes !== undefined ? tracker.notes : (existing?.notes || null),
      lastActionDate: tracker.lastActionDate || new Date().toISOString(),
      followUpDate: tracker.followUpDate !== undefined ? tracker.followUpDate : (existing?.followUpDate || null),
      checklist: tracker.checklist || existing?.checklist || {
        headline: false,
        bio: false,
        portfolio: false,
        rates: false,
        skills: false,
        verification: false,
        payout: false,
      },
      customPitch: tracker.customPitch !== undefined ? tracker.customPitch : (existing?.customPitch || null),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.platformTrackers.set(tracker.platformId, updated);
    this.persistState();
    return updated;
  }

  public getDailyTarget(dateStr?: string): PlatformDailyTargetEntity {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const existing = this.platformDailyTargets.get(today);
    if (existing) return existing;
    const initial: PlatformDailyTargetEntity = {
      id: `tgt_${today}`,
      targetDate: today,
      targetCount: 5,
      completedCount: 0,
      updatedAt: new Date().toISOString(),
    };
    this.platformDailyTargets.set(today, initial);
    return initial;
  }

  public incrementDailyProposals(dateStr?: string): PlatformDailyTargetEntity {
    const target = this.getDailyTarget(dateStr);
    target.completedCount += 1;
    target.updatedAt = new Date().toISOString();
    this.platformDailyTargets.set(target.targetDate, target);
    this.persistState();
    return target;
  }

  public getOperatorProfile(): OperatorProfileEntity {
    return { ...this.operatorProfile };
  }

  public saveOperatorProfile(profile: Partial<OperatorProfileEntity>): OperatorProfileEntity {
    this.operatorProfile = {
      ...this.operatorProfile,
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    this.persistState();
    return { ...this.operatorProfile };
  }

}

import { SupabaseDataStore } from './supabase-data-store';

export const inMemoryDataStore = new DataStore();
export const supabaseDataStore = new SupabaseDataStore(inMemoryDataStore);
export const dataStore: IDataStore = supabaseDataStore;
