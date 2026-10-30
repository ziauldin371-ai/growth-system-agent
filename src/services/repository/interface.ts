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
  SchedulerRunHistoryEntity
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
  }): { businesses: BusinessEntity[]; total: number } | Promise<{ businesses: BusinessEntity[]; total: number }>;

  getBusinessById(id: string): (BusinessEntity | null) | Promise<BusinessEntity | null>;
  saveBusiness(b: BusinessEntity): void | Promise<void>;
  saveEvidence(businessId: string, ev: GrowthEvidenceEntity[]): void | Promise<void>;
  saveWebsiteCheck(check: WebsiteCheckEntity): void | Promise<void>;
  saveLeadScore(score: LeadScoreEntity): void | Promise<void>;
  saveContact(contact: ContactEntity): void | Promise<void>;

  // Drafts
  getDrafts(filter?: { status?: string; campaignId?: string }): EmailDraftEntity[] | Promise<EmailDraftEntity[]>;
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
  getReadyForEmailLeads(): Array<any> | Promise<Array<any>>;
  getSentEmails(): Array<any> | Promise<Array<any>>;
  getOtherOutreachOpportunities(): Array<any> | Promise<Array<any>>;
  getEmailSentPlusOtherChannels(): Array<any> | Promise<Array<any>>;
  getNoEmailBusinesses(): Array<any> | Promise<Array<any>>;
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
  getPlatformStats(): any | Promise<any>;
}

