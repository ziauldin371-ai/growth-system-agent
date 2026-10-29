/**
 * GrowthSignal AI — Core Domain Type Definitions
 */

export type OperatingMode = 'research' | 'approval' | 'auto_send';

export type PipelineType = 
  | 'website_opportunities' 
  | 'ai_software_opportunities' 
  | 'unassigned' 
  | 'disqualified';

export type WebsiteStatus = 
  | 'functional' 
  | 'apparently_absent' 
  | 'social_only' 
  | 'parked' 
  | 'broken' 
  | 'inconclusive';

export type QualificationStatus = 
  | 'unreviewed' 
  | 'qualified' 
  | 'disqualified' 
  | 'contacted' 
  | 'replied' 
  | 'closed_won';

export type TargetMarket = 'US' | 'UK' | 'CA' | 'AU' | 'EU' | 'GLOBAL';

export type OutreachStrategy = 
  | 'web_development' 
  | 'ai_automation' 
  | 'rag_systems' 
  | 'python_engineering' 
  | 'data_science' 
  | 'agency_partner';

export type JobStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'dead_letter';

export interface BusinessEntity {
  id: string;
  organizationId: string;
  name: string;
  normalizedName: string;
  domain?: string | null;
  normalizedDomain?: string | null;
  country: string;
  region?: string | null;
  city?: string | null;
  postalCode?: string | null;
  address?: string | null;
  phone?: string | null;
  industry?: string | null;
  companyType?: string | null;
  employeeCountRange?: string | null;
  annualRevenueRange?: string | null;
  pipelineType: PipelineType;
  qualificationStatus: QualificationStatus;
  discoveryRunId?: string | null;
  sourceProvider: string;
  sourceIdentifier?: string | null;
  isArchived: boolean;
  fetchedAt?: string;
  rawPayloadRef?: Record<string, any>;
  lastVerifiedAt?: string | null;
  isPermanentlyClosed?: boolean;
  heatScore?: number;
  triggerFreshnessRank?: number;
  decisionMakerRole?: string | null;
  decisionMakerName?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relationships
  evidence?: GrowthEvidenceEntity[];
  websiteCheck?: WebsiteCheckEntity | null;
  contacts?: ContactEntity[];
  score?: LeadScoreEntity | null;
  alternativeChannels?: AlternativeChannelEntity[];
}

export interface GrowthEvidenceEntity {
  id: string;
  businessId: string;
  sourceName: string;
  sourceUrl?: string | null;
  observationTime: string;
  evidenceType: string;
  summary: string;
  isFactual: boolean; // true = verified fact, false = inference
  confidence: number; // 0.00 to 1.00
  freshnessScore: number; // 0.00 to 1.00
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface WebsiteCheckEntity {
  id: string;
  businessId: string;
  domain?: string | null;
  status: WebsiteStatus;
  dnsRecords?: Record<string, any> | null;
  httpStatusCode?: number | null;
  tlsValid?: boolean | null;
  ipAddress?: string | null;
  isPrivateIp: boolean;
  redirectChain?: string[] | null;
  socialUrls?: string[] | null;
  pageTitle?: string | null;
  metaDescription?: string | null;
  verificationLatencyMs?: number | null;
  checkedAt: string;
  errorDetails?: string | null;
}

export interface ContactEntity {
  id: string;
  businessId: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  email?: string | null;
  normalizedEmail?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  confidence: number;
  verificationStatus: 'verified' | 'unverified' | 'invalid' | 'role_account' | 'disposable';
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICPProfileEntity {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  targetPipeline: 'website_opportunities' | 'ai_software_opportunities';
  description?: string | null;
  scoringWeights: Record<string, number>;
  qualificationCriteria: Record<string, any>;
  confidenceThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadScoreEntity {
  id: string;
  businessId: string;
  icpProfileId?: string | null;
  overallScore: number; // 0 - 100
  activityScore: number; // 0 - 100
  serviceFitScore: number; // 0 - 100
  websiteOpportunityScore: number; // 0 - 100
  aiOpportunityScore: number; // 0 - 100
  contactQualityScore: number; // 0 - 100
  confidenceScore: number; // 0.00 - 1.00
  reasoning: string;
  scoreBreakdown: Record<string, any>;
  scoredAt: string;
}

export interface EmailDraftEntity {
  id: string;
  businessId: string;
  contactId?: string | null;
  campaignId?: string | null;
  strategy: OutreachStrategy;
  subjectLines: [string, string, string];
  selectedSubject: string;
  emailBody: string;
  htmlBody?: string;
  callToAction: string;
  serviceOffer: string;
  researchSummary: string;
  observations: Array<{
    fact: string;
    source: string;
    isVerified: boolean;
  }>;
  rationale: string;
  warnings: string[];
  confidenceRating: number;
  version: number;
  status: 'draft' | 'approved' | 'rejected' | 'sent';
  approvedBy?: string | null;
  approvedAt?: string | null;
  // Gmail & Delivery Tracking
  gmailMessageId?: string | null;
  gmailThreadId?: string | null;
  gmailUrl?: string | null;
  recipientEmail?: string | null;
  sentAt?: string | null;
  deliveryStatus?: 'sent' | 'delivered' | 'bounced' | 'failed' | 'replied';
  gmailConfirmed?: boolean;
  gmailLabels?: string[];
  confirmedSentAt?: string | null;
  reconciledStatus?: 'draft' | 'uncertain' | 'sent_confirmed' | 'failed';
  qualityGatePassed?: boolean;
  qualityGateMetrics?: {
    wordCount: number;
    readingLevel: string;
    spamScore: number;
    hasUnsub: boolean;
    evidenceMatchesCount: number;
    linkCount: number;
    verdict: 'pass' | 'fail';
  };
  createdAt: string;
  updatedAt: string;
}

export type AlternativeChannelPlatform = 
  | 'linkedin' 
  | 'contact_form' 
  | 'instagram' 
  | 'facebook' 
  | 'twitter' 
  | 'youtube' 
  | 'directory' 
  | 'other';

export type AlternativeChannelStatus = 
  | 'not_contacted' 
  | 'manually_contacted' 
  | 'replied' 
  | 'not_applicable';

export interface AlternativeChannelEntity {
  id: string;
  businessId: string;
  businessName?: string;
  country?: string;
  platform: AlternativeChannelPlatform;
  profileUrl: string;
  handleOrIdentifier?: string | null;
  sourceName: string;
  sourceUrl?: string | null;
  isUsable: boolean;
  customPitch: string;
  status: AlternativeChannelStatus;
  lastCheckedAt: string;
  contactedAt?: string | null;
  reminderDate?: string | null;
  notes?: string | null;
  isVerifiedMatch?: boolean;
  evidenceSources?: Array<{ sourceName: string; sourceUrl?: string }>;
  charCount?: number;
  suggestedTouchOrder?: number;
  nextTouchEligibleAt?: string | null;
  isLockedOptOut?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerRunHistoryEntity {
  runId: string;
  status: 'completed' | 'skipped' | 'failed';
  startTimePkt: string;
  finishTimePkt: string;
  startTimeUtc: string;
  finishTimeUtc: string;
  countriesSearched: string[];
  sourcesSearched: string[];
  leadsDiscovered: number;
  leadsQualified: number;
  draftsGenerated: number;
  emailsSent: number;
  skippedRecordsCount: number;
  skippedReasons: Record<string, number>;
  alternativeChannelsFound: number;
  operatingMode: OperatingMode;
  reason?: string;
  errors?: string[];
  durationMs: number;
  nextScheduledRunPkt: string;
  nextScheduledRunUtc: string;
  notificationStatus?: 'sent' | 'failed' | 'mock_delivered';
}

export interface CampaignEntity {
  id: string;
  organizationId: string;
  name: string;
  targetPipeline: 'website_opportunities' | 'ai_software_opportunities';
  strategy: OutreachStrategy;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  requiresApproval: boolean;
  dailyCap: number;
  sendingWindowStart: number;
  sendingWindowEnd: number;
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalLeads: number;
    approvedLeads: number;
    sentCount: number;
    deliveredCount: number;
    repliedCount: number;
    bouncedCount: number;
    unsubscribedCount: number;
  };
}

export interface AutomationJobEntity {
  id: string;
  organizationId?: string | null;
  idempotencyKey?: string | null;
  jobType: string;
  status: JobStatus;
  priority: number;
  payload: Record<string, any>;
  result?: Record<string, any> | null;
  retryCount: number;
  maxRetries: number;
  scheduledAt: string;
  lockedAt?: string | null;
  lockedBy?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuppressionEntry {
  id: string;
  organizationId: string;
  type: 'email' | 'domain' | 'company';
  value: string;
  reason: 'unsubscribe' | 'hard_bounce' | 'complaint' | 'manual_dnc' | 'legal_risk' | 'competitor';
  notes?: string | null;
  createdAt: string;
}

export interface BuyingTriggerEntity {
  id: string;
  businessId: string;
  triggerType: 'new_registration' | 'hiring_signal' | 'review_friction' | 'website_decay' | 'funding_expansion';
  title: string;
  summary: string;
  sourceUrl?: string | null;
  sourceName: string;
  observedDate: string;
  confidence: number;
  weightScore: number;
  createdAt: string;
}

export interface ProductizedOfferEntity {
  id: string;
  title: string;
  slug: string;
  targetPipeline: 'website_opportunities' | 'ai_software_opportunities' | 'both';
  scope: string;
  deliverables: string[];
  timeline: string;
  startingPriceRange: string;
  excludedItems: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProofItemEntity {
  id: string;
  title: string;
  clientIndustry: string;
  serviceType: string;
  summary: string;
  metricResult?: string | null;
  testimonialQuote?: string | null;
  caseStudyUrl?: string | null;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DomainHealthEntity {
  id: string;
  domain: string;
  spfStatus: 'pass' | 'missing' | 'invalid';
  dkimStatus: 'pass' | 'missing' | 'invalid';
  dmarcStatus: 'pass' | 'missing' | 'invalid';
  dmarcPolicy: string;
  mxStatus: 'pass' | 'missing' | 'invalid';
  details: Record<string, any>;
  checkedAt: string;
}

export interface InboxPlacementTestEntity {
  id: string;
  testSubject: string;
  templateName: string;
  testResults: Array<{
    provider: 'Gmail' | 'Outlook' | 'Yahoo' | 'Workspace';
    placement: 'Primary' | 'Promotions' | 'Spam';
    timestamp: string;
  }>;
  primaryRate: number;
  spamRate: number;
  overallResult: 'pass' | 'warning' | 'fail';
  testedAt: string;
}

export type IntentPlatform = 
  | 'hacker_news' 
  | 'reddit' 
  | 'remote_ok' 
  | 'remotive' 
  | 'github' 
  | 'upwork_manual' 
  | 'linkedin_manual' 
  | 'x_twitter' 
  | 'tender' 
  | 'other_manual';

export type IntentType = 
  | 'explicit_hire_request' 
  | 'job_posting' 
  | 'recommendation_request' 
  | 'tender' 
  | 'pain_point_complaint' 
  | 'partnership_request' 
  | 'not_relevant';

export type ReplyRoute = 
  | 'email' 
  | 'dm' 
  | 'public_comment' 
  | 'marketplace_proposal' 
  | 'apply_link' 
  | 'manual_reachout';

export interface IntentOpportunityEntity {
  id: string;
  sourcePlatform: IntentPlatform;
  sourceUrl: string;
  sourceIdentifier?: string | null;
  title: string;
  rawContent: string;
  sanitizedSummary: string;
  posterIdentity?: string | null;
  posterContactInfo?: {
    email?: string;
    handle?: string;
    applyUrl?: string;
    profileUrl?: string;
  };
  intentType: IntentType;
  neededSkills: string[];
  statedBudget?: string | null;
  urgency?: string | null;
  locationOrTz?: string | null;
  contractType?: string | null;
  fitScore: number; // 0 - 100
  fitReasoning: string;
  legitimacyScore: number; // 0 - 100
  isLegitimate: boolean;
  scamWarningFlags: string[];
  replyRoute: ReplyRoute;
  tailoredPitch?: string | null;
  pitchWordCount?: number;
  status: 'new' | 'pitched' | 'replied' | 'call_booked' | 'won' | 'lost' | 'dismissed';
  postedAt: string;
  fetchedAt: string;
  contactedAt?: string | null;
  reminderDate?: string | null;
  respondWithinHours?: number;
  isManualImport: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPitchRuleEntity {
  id: string;
  platform: string;
  communityName: string;
  ruleNotes: string;
  maxWords: number;
  allowDirectLinks: boolean;
  toneGuidance?: string;
  createdAt: string;
}
