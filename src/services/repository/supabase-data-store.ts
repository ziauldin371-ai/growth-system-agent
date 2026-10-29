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
} from '@/types';
import { IDataStore } from './interface';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { dataStore } from './data-store';

/**
 * Supabase Data Store Repository
 * Implements IDataStore by querying and persisting data directly to Supabase PostgreSQL.
 * Falls back to persistent file-backed dataStore if Supabase is offline or unconfigured.
 */
export class SupabaseDataStore implements IDataStore {
  private fallbackStore = dataStore;

  private getClient() {
    return getSupabaseAdmin();
  }

  // --- Businesses ---
  public async getBusinesses(filter?: {
    pipeline?: PipelineType | 'all';
    search?: string;
    qualificationStatus?: string;
    country?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ businesses: BusinessEntity[]; total: number }> {
    const supabase = this.getClient();
    if (!supabase) {
      return this.fallbackStore.getBusinesses(filter);
    }

    try {
      let query = supabase.from('businesses').select('*', { count: 'exact' });

      if (filter?.pipeline && filter.pipeline !== 'all') {
        query = query.eq('pipeline_type', filter.pipeline);
      }
      if (filter?.qualificationStatus && filter.qualificationStatus !== 'all') {
        query = query.eq('qualification_status', filter.qualificationStatus);
      }
      if (filter?.country && filter.country !== 'all') {
        query = query.eq('country', filter.country);
      }
      if (filter?.search) {
        query = query.or(`name.ilike.%${filter.search}%,domain.ilike.%${filter.search}%`);
      }

      const limit = filter?.limit || 50;
      const offset = filter?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error || !data) {
        return this.fallbackStore.getBusinesses(filter);
      }

      const businesses: BusinessEntity[] = data.map((b: any) => ({
        id: b.id,
        organizationId: b.organization_id,
        name: b.name,
        normalizedName: b.normalized_name,
        domain: b.domain,
        normalizedDomain: b.normalized_domain,
        country: b.country,
        region: b.region,
        city: b.city,
        postalCode: b.postal_code,
        address: b.address,
        phone: b.phone,
        industry: b.industry,
        companyType: b.company_type,
        employeeCountRange: b.employee_count_range,
        annualRevenueRange: b.annual_revenue_range,
        pipelineType: b.pipeline_type,
        qualificationStatus: b.qualification_status,
        sourceProvider: b.source_provider,
        sourceIdentifier: b.source_identifier,
        isArchived: b.is_archived,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));

      return { businesses, total: count || businesses.length };
    } catch {
      return this.fallbackStore.getBusinesses(filter);
    }
  }

  public async getBusinessById(id: string): Promise<BusinessEntity | null> {
    const supabase = this.getClient();
    if (!supabase) return this.fallbackStore.getBusinessById(id);

    try {
      const { data, error } = await supabase.from('businesses').select('*').eq('id', id).single();
      if (error || !data) return this.fallbackStore.getBusinessById(id);

      return {
        id: data.id,
        organizationId: data.organization_id,
        name: data.name,
        normalizedName: data.normalized_name,
        domain: data.domain,
        normalizedDomain: data.normalized_domain,
        country: data.country,
        region: data.region,
        city: data.city,
        postalCode: data.postal_code,
        address: data.address,
        phone: data.phone,
        industry: data.industry,
        companyType: data.company_type,
        employeeCountRange: data.employee_count_range,
        annualRevenueRange: data.annual_revenue_range,
        pipelineType: data.pipeline_type,
        qualificationStatus: data.qualification_status,
        sourceProvider: data.source_provider,
        sourceIdentifier: data.source_identifier,
        isArchived: data.is_archived,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallbackStore.getBusinessById(id);
    }
  }

  public async saveBusiness(b: BusinessEntity): Promise<void> {
    this.fallbackStore.saveBusiness(b);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('businesses').upsert({
        id: b.id,
        organization_id: b.organizationId || '00000000-0000-0000-0000-000000000001',
        name: b.name,
        normalized_name: b.normalizedName,
        domain: b.domain,
        normalized_domain: b.normalizedDomain,
        country: b.country,
        region: b.region,
        city: b.city,
        postal_code: b.postalCode,
        address: b.address,
        phone: b.phone,
        industry: b.industry,
        company_type: b.companyType,
        employee_count_range: b.employeeCountRange,
        annual_revenue_range: b.annualRevenueRange,
        pipeline_type: b.pipelineType,
        qualification_status: b.qualificationStatus,
        source_provider: b.sourceProvider,
        source_identifier: b.sourceIdentifier,
        is_archived: b.isArchived,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Supabase saveBusiness error:', err);
    }
  }

  public async saveEvidence(businessId: string, ev: GrowthEvidenceEntity[]): Promise<void> {
    this.fallbackStore.saveEvidence(businessId, ev);
  }

  public async saveWebsiteCheck(check: WebsiteCheckEntity): Promise<void> {
    this.fallbackStore.saveWebsiteCheck(check);
  }

  public async saveLeadScore(score: LeadScoreEntity): Promise<void> {
    this.fallbackStore.saveLeadScore(score);
  }

  public async saveContact(contact: ContactEntity): Promise<void> {
    this.fallbackStore.saveContact(contact);
  }

  // --- Drafts ---
  public async getDrafts(filter?: { status?: string; campaignId?: string }): Promise<EmailDraftEntity[]> {
    const supabase = this.getClient();
    if (!supabase) return this.fallbackStore.getDrafts(filter);

    try {
      let query = supabase.from('email_drafts').select('*');
      if (filter?.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }
      if (filter?.campaignId) {
        query = query.eq('campaign_id', filter.campaignId);
      }

      const { data, error } = await query;
      if (error || !data) return this.fallbackStore.getDrafts(filter);

      return data.map((d: any) => ({
        id: d.id,
        businessId: d.business_id,
        contactId: d.contact_id,
        campaignId: d.campaign_id,
        strategy: d.strategy,
        subjectLines: d.subject_lines,
        selectedSubject: d.selected_subject,
        emailBody: d.email_body,
        callToAction: d.call_to_action,
        serviceOffer: d.service_offer,
        researchSummary: d.research_summary,
        observations: d.observations || [],
        rationale: d.research_summary || 'Standard cold outreach strategy',
        warnings: [],
        confidenceRating: 0.9,
        version: 1,
        qualityGatePassed: d.quality_gate_passed,
        status: d.status,
        approvedBy: d.approved_by,
        approvedAt: d.approved_at,
        sentAt: d.sent_at,
        gmailMessageId: d.gmail_message_id,
        deliveryStatus: d.delivery_status,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return this.fallbackStore.getDrafts(filter);
    }
  }

  public async getDraftById(id: string): Promise<EmailDraftEntity | null> {
    return this.fallbackStore.getDraftById(id);
  }

  public async saveDraft(draft: EmailDraftEntity): Promise<void> {
    this.fallbackStore.saveDraft(draft);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('email_drafts').upsert({
        id: draft.id,
        business_id: draft.businessId,
        contact_id: draft.contactId,
        campaign_id: draft.campaignId,
        strategy: draft.strategy,
        subject_lines: draft.subjectLines,
        selected_subject: draft.selectedSubject,
        email_body: draft.emailBody,
        call_to_action: draft.callToAction,
        service_offer: draft.serviceOffer,
        research_summary: draft.researchSummary,
        observations: draft.observations,
        quality_gate_passed: draft.qualityGatePassed,
        status: draft.status,
        approved_by: draft.approvedBy,
        approved_at: draft.approvedAt,
        sent_at: draft.sentAt,
        gmail_message_id: draft.gmailMessageId,
        delivery_status: draft.deliveryStatus,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Supabase saveDraft error:', err);
    }
  }

  public async updateDraftStatus(
    id: string, 
    status: 'draft' | 'approved' | 'rejected' | 'sent', 
    approvedBy?: string
  ): Promise<EmailDraftEntity | null> {
    return this.fallbackStore.updateDraftStatus(id, status, approvedBy);
  }

  // --- Campaigns ---
  public async getCampaigns(): Promise<CampaignEntity[]> {
    return this.fallbackStore.getCampaigns();
  }

  public async getCampaignById(id: string): Promise<CampaignEntity | null> {
    return this.fallbackStore.getCampaignById(id);
  }

  public async saveCampaign(campaign: CampaignEntity): Promise<void> {
    this.fallbackStore.saveCampaign(campaign);
  }

  // --- Suppression ---
  public async getSuppressionList(): Promise<SuppressionEntry[]> {
    const supabase = this.getClient();
    if (!supabase) return this.fallbackStore.getSuppressionList();

    try {
      const { data, error } = await supabase.from('suppression_list').select('*');
      if (error || !data) return this.fallbackStore.getSuppressionList();

      return data.map((s: any) => ({
        id: s.id,
        organizationId: s.organization_id,
        type: s.type,
        value: s.value,
        reason: s.reason,
        notes: s.notes,
        createdAt: s.created_at,
      }));
    } catch {
      return this.fallbackStore.getSuppressionList();
    }
  }

  public async addSuppression(entry: SuppressionEntry): Promise<void> {
    this.fallbackStore.addSuppression(entry);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('suppression_list').upsert({
        organization_id: entry.organizationId || '00000000-0000-0000-0000-000000000001',
        type: entry.type,
        value: entry.value.toLowerCase(),
        reason: entry.reason,
        notes: entry.notes,
      }, { onConflict: 'organization_id,type,value' });
    } catch (err) {
      console.warn('Supabase addSuppression error:', err);
    }
  }

  public async isSuppressed(emailOrDomain: string): Promise<boolean> {
    const clean = emailOrDomain.trim().toLowerCase();
    const isLocalSuppressed = this.fallbackStore.isSuppressed(clean);
    if (isLocalSuppressed) return true;

    const supabase = this.getClient();
    if (!supabase) return false;

    try {
      const { data } = await supabase
        .from('suppression_list')
        .select('value')
        .eq('value', clean)
        .limit(1);

      if (data && data.length > 0) return true;

      if (clean.includes('@')) {
        const domain = clean.split('@')[1];
        const { data: domData } = await supabase
          .from('suppression_list')
          .select('value')
          .eq('value', domain)
          .limit(1);

        if (domData && domData.length > 0) return true;
      }
    } catch {
      // ignore
    }

    return false;
  }

  // --- Automation Jobs ---
  public async getJobs(): Promise<AutomationJobEntity[]> {
    const supabase = this.getClient();
    if (!supabase) return this.fallbackStore.getJobs();

    try {
      const { data, error } = await supabase
        .from('automation_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return this.fallbackStore.getJobs();

      return data.map((j: any) => ({
        id: j.id,
        organizationId: j.organization_id,
        idempotencyKey: j.idempotency_key,
        jobType: j.job_type,
        status: j.status,
        priority: j.priority,
        payload: j.payload,
        result: j.result,
        retryCount: j.retry_count,
        maxRetries: j.max_retries,
        scheduledAt: j.scheduled_for || j.created_at,
        lockedAt: j.locked_until,
        lockedBy: j.locked_by,
        errorMessage: j.error_details,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      }));
    } catch {
      return this.fallbackStore.getJobs();
    }
  }

  public async saveJob(job: AutomationJobEntity): Promise<void> {
    this.fallbackStore.saveJob(job);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('automation_jobs').upsert({
        id: job.id,
        organization_id: job.organizationId || '00000000-0000-0000-0000-000000000001',
        idempotency_key: job.idempotencyKey,
        job_type: job.jobType,
        status: job.status,
        priority: job.priority,
        payload: job.payload,
        result: job.result,
        retry_count: job.retryCount,
        max_retries: job.maxRetries,
        error_details: job.errorMessage,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Supabase saveJob error:', err);
    }
  }

  public async updateJob(id: string, updates: Partial<AutomationJobEntity>): Promise<AutomationJobEntity | null> {
    return this.fallbackStore.updateJob(id, updates);
  }

  // --- Operating Modes ---
  public getOperatingMode(): OperatingMode {
    return this.fallbackStore.getOperatingMode();
  }

  public setOperatingMode(mode: OperatingMode): void {
    this.fallbackStore.setOperatingMode(mode);
  }

  public isAutomationPaused(): boolean {
    return this.fallbackStore.isAutomationPaused();
  }

  public setAutomationPaused(paused: boolean): void {
    this.fallbackStore.setAutomationPaused(paused);
  }

  // --- Alternative Channels ---
  public async saveAlternativeChannel(channel: AlternativeChannelEntity): Promise<void> {
    this.fallbackStore.saveAlternativeChannel(channel);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('alternative_channels').upsert({
        id: channel.id,
        organization_id: '00000000-0000-0000-0000-000000000001',
        business_id: channel.businessId,
        platform: channel.platform,
        profile_url: channel.profileUrl,
        handle_or_identifier: channel.handleOrIdentifier,
        source_name: channel.sourceName,
        source_url: channel.sourceUrl,
        is_usable: channel.isUsable,
        custom_pitch: channel.customPitch,
        status: channel.status,
        last_checked_at: channel.lastCheckedAt,
        contacted_at: channel.contactedAt,
        next_touch_eligible_at: channel.nextTouchEligibleAt,
        is_locked_opt_out: channel.isLockedOptOut,
        notes: channel.notes,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Supabase saveAlternativeChannel error:', err);
    }
  }

  public async getAlternativeChannels(businessId?: string): Promise<AlternativeChannelEntity[]> {
    return this.fallbackStore.getAlternativeChannels(businessId);
  }

  public async getAlternativeChannelById(id: string): Promise<AlternativeChannelEntity | null> {
    return this.fallbackStore.getAlternativeChannelById(id);
  }

  public async updateAlternativeChannelStatus(
    channelId: string, 
    status?: AlternativeChannelStatus, 
    reminderDate?: string | null, 
    notes?: string | null,
    customPitch?: string
  ): Promise<boolean> {
    return this.fallbackStore.updateAlternativeChannelStatus(channelId, status, reminderDate, notes, customPitch);
  }

  // --- Dashboard Queries ---
  public async getWorldwideLeads(filters?: any): Promise<BusinessEntity[]> {
    return this.fallbackStore.getWorldwideLeads(filters);
  }

  public async getReadyForEmailLeads(): Promise<Array<any>> {
    return this.fallbackStore.getReadyForEmailLeads();
  }

  public async getSentEmails(): Promise<Array<any>> {
    return this.fallbackStore.getSentEmails();
  }

  public async getOtherOutreachOpportunities(): Promise<Array<any>> {
    return this.fallbackStore.getOtherOutreachOpportunities();
  }

  public async getEmailSentPlusOtherChannels(): Promise<Array<any>> {
    return this.fallbackStore.getEmailSentPlusOtherChannels();
  }

  public async getNoEmailBusinesses(): Promise<Array<any>> {
    return this.fallbackStore.getNoEmailBusinesses();
  }

  public async lockAllChannelsForBusiness(businessId: string, reason: string): Promise<void> {
    this.fallbackStore.lockAllChannelsForBusiness(businessId, reason);
  }

  public async recordChannelContact(channelId: string, contactedAt?: string): Promise<void> {
    this.fallbackStore.recordChannelContact(channelId, contactedAt);
  }

  // --- Locks & Runs ---
  public acquireLock(name: string, ttlMs?: number): boolean {
    return this.fallbackStore.acquireLock(name, ttlMs);
  }

  public releaseLock(name: string): void {
    this.fallbackStore.releaseLock(name);
  }

  public async recordSchedulerRun(run: any): Promise<void> {
    this.fallbackStore.recordSchedulerRun(run);
  }

  public async getSchedulerRuns(): Promise<any[]> {
    return this.fallbackStore.getSchedulerRuns();
  }

  public async getLastSchedulerRun(): Promise<any | null> {
    return this.fallbackStore.getLastSchedulerRun();
  }

  public async getPlatformStats(): Promise<any> {
    return this.fallbackStore.getPlatformStats();
  }
}

export const supabaseDataStore = new SupabaseDataStore();
