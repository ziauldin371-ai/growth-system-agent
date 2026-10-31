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
  OperatingMode,
  AlternativeChannelEntity,
  AlternativeChannelStatus,
  SchedulerRunHistoryEntity,
  PlatformEntity,
  VettedApplicationEntity,
  LeadSourceConfigEntity,
  PlatformFootprintCandidate,
  MarketplaceHotRequestEntity,
  PlatformSpendLogEntity
} from '@/types';

export interface IDataStore {
  // Businesses
  getBusinesses(filter?: {
    pipeline?: PipelineType | 'all';
    search?: string;
    qualificationStatus?: string;
    country?: string;
    limit?: number;
    offset?: number;
    includeDemo?: boolean;
  }): { businesses: BusinessEntity[]; total: number } | Promise<{ businesses: BusinessEntity[]; total: number }>;

  getBusinessById(id: string): (BusinessEntity | null) | Promise<BusinessEntity | null>;
  saveBusiness(b: BusinessEntity): void | Promise<void>;
  saveEvidence(businessId: string, ev: GrowthEvidenceEntity[]): void | Promise<void>;
  saveWebsiteCheck(check: WebsiteCheckEntity): void | Promise<void>;
  saveLeadScore(score: LeadScoreEntity): void | Promise<void>;
  saveContact(contact: ContactEntity): void | Promise<void>;

  // Drafts
  getDrafts(filter?: { status?: string; campaignId?: string; limit?: number; offset?: number; includeDemo?: boolean }): EmailDraftEntity[] | Promise<EmailDraftEntity[]>;
  getDraftById(id: string): (EmailDraftEntity | null) | Promise<EmailDraftEntity | null>;
  saveDraft(draft: EmailDraftEntity): void | Promise<void>;
  updateDraftStatus(
    id: string, 
    status: 'draft' | 'approved' | 'rejected' | 'sent', 
    approvedBy?: string
  ): (EmailDraftEntity | null) | Promise<EmailDraftEntity | null>;

  // Campaigns
  getCampaigns(): CampaignEntity[] | Promise<CampaignEntity[]>;
  getCampaignById(id: string): (CampaignEntity | null) | Promise<CampaignEntity | null>;
  saveCampaign(campaign: CampaignEntity): void | Promise<void>;

  // Suppression
  getSuppressionList(): SuppressionEntry[] | Promise<SuppressionEntry[]>;
  addSuppression(entry: SuppressionEntry): void | Promise<void>;
  isSuppressed(emailOrDomain: string): boolean | Promise<boolean>;

  // Jobs
  getJobs(): AutomationJobEntity[] | Promise<AutomationJobEntity[]>;
  saveJob(job: AutomationJobEntity): void | Promise<void>;
  updateJob(id: string, updates: Partial<AutomationJobEntity>): (AutomationJobEntity | null) | Promise<AutomationJobEntity | null>;

  // Operating Modes
  getOperatingMode(): OperatingMode;
  setOperatingMode(mode: OperatingMode): void;
  isAutomationPaused(): boolean;
  setAutomationPaused(paused: boolean): void;

  // Alternative Channels
  saveAlternativeChannel(channel: AlternativeChannelEntity): void | Promise<void>;
  getAlternativeChannels(businessId?: string): AlternativeChannelEntity[] | Promise<AlternativeChannelEntity[]>;
  getAlternativeChannelById(id: string): (AlternativeChannelEntity | null) | Promise<AlternativeChannelEntity | null>;
  updateAlternativeChannelStatus(
    channelId: string, 
    status?: AlternativeChannelStatus, 
    reminderDate?: string | null, 
    notes?: string | null,
    customPitch?: string
  ): boolean | Promise<boolean>;

  // Views & Queries
  getWorldwideLeads(filters?: any): BusinessEntity[] | Promise<BusinessEntity[]>;
  getReadyForEmailLeads(options?: any): Array<any> | Promise<Array<any>>;
  getSentEmails(options?: any): Array<any> | Promise<Array<any>>;
  getOtherOutreachOpportunities(options?: any): Array<any> | Promise<Array<any>>;
  getEmailSentPlusOtherChannels(options?: any): Array<any> | Promise<Array<any>>;
  getNoEmailBusinesses(options?: any): Array<any> | Promise<Array<any>>;
  lockAllChannelsForBusiness(businessId: string, reason: string): void | Promise<void>;
  recordChannelContact(channelId: string, contactedAt?: string): void | Promise<void>;

  // Locking, Checkpoints & History
  acquireLock(name: string, ttlMs?: number): boolean | Promise<boolean>;
  releaseLock(name: string): void | Promise<void>;
  saveCheckpoint(taskName: string, cursorData: any, itemsRemaining?: number): void | Promise<void>;
  getCheckpoint(taskName: string): any | Promise<any>;
  recordSchedulerRun(run: any): void | Promise<void>;
  getSchedulerRuns(): any[] | Promise<any[]>;
  getLastSchedulerRun(): any | null | Promise<any | null>;
  getPlatformStats(options?: any): any | Promise<any>;

  // Platform Registry & Acquisition Engine (Prompt: Platforms)
  getPlatforms(filters?: { category?: string; priority?: string; pitchMode?: string; countryEligibility?: string; myAccountStatus?: string; search?: string }): PlatformEntity[] | Promise<PlatformEntity[]>;
  getPlatformById(id: string): (PlatformEntity | null) | Promise<PlatformEntity | null>;
  savePlatform(platform: PlatformEntity): void | Promise<void>;
  updatePlatform(id: string, updates: Partial<PlatformEntity>): (PlatformEntity | null) | Promise<PlatformEntity | null>;
  verifyPlatformTerms(id: string, verifiedAt?: string): (PlatformEntity | null) | Promise<PlatformEntity | null>;

  // Vetted Applications Tracker (Group B)
  getVettedApplications(): VettedApplicationEntity[] | Promise<VettedApplicationEntity[]>;
  getVettedApplicationById(id: string): (VettedApplicationEntity | null) | Promise<VettedApplicationEntity | null>;
  saveVettedApplication(app: VettedApplicationEntity): void | Promise<void>;
  updateVettedApplication(id: string, updates: Partial<VettedApplicationEntity>): (VettedApplicationEntity | null) | Promise<VettedApplicationEntity | null>;

  // Lead Source Configs (Group C)
  getLeadSourceConfigs(): LeadSourceConfigEntity[] | Promise<LeadSourceConfigEntity[]>;
  saveLeadSourceConfig(config: LeadSourceConfigEntity): void | Promise<void>;
  recordLeadSourceUsage(sourceName: string, creditsUsed?: number): void | Promise<void>;

  // Platform Footprints ("Where else can I reach them?")
  getFootprintsForBusiness(businessId: string): PlatformFootprintCandidate[] | Promise<PlatformFootprintCandidate[]>;
  saveFootprint(footprint: PlatformFootprintCandidate): void | Promise<void>;
  deleteFootprint(id: string): void | Promise<void>;

  // Marketplace Hot Requests (Group A)
  getHotRequests(filters?: { platform?: string; minFit?: number; status?: string }): MarketplaceHotRequestEntity[] | Promise<MarketplaceHotRequestEntity[]>;
  saveHotRequest(request: MarketplaceHotRequestEntity): void | Promise<void>;
  updateHotRequestStatus(id: string, status: 'new' | 'proposal_copied' | 'submitted' | 'declined'): boolean | Promise<boolean>;

  // Platform Spend Logs
  getPlatformSpendLogs(platformId?: string): PlatformSpendLogEntity[] | Promise<PlatformSpendLogEntity[]>;
  recordPlatformSpend(spend: PlatformSpendLogEntity): void | Promise<void>;
  seedDemoData?(force?: boolean): void | Promise<void>;
  clearDemoData?(): void | Promise<void>;
  hasDemoData?(): boolean | Promise<boolean>;
}

