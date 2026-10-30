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
  AlternativeChannelStatus 
} from '@/types';
import { IDataStore } from './interface';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { inMemoryDataStore as fallbackStore } from './data-store';

export class SupabaseDataStore implements IDataStore {
  private get fallback(): any {
    return fallbackStore;
  }

  private getClient(writeRequired = false) {
    const supabase = getSupabaseAdmin();
    if (!supabase && writeRequired && process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL PERSISTENCE VIOLATION: Supabase PostgreSQL is required in production mode. Ephemeral local-file or in-memory state is strictly prohibited.'
      );
    }
    return supabase;
  }

  // --- Businesses ---
  public async getBusinesses(filter?: {
    pipeline?: PipelineType | 'all';
    search?: string;
    qualificationStatus?: string;
    country?: string;
    limit?: number;
    offset?: number;
    includeDemo?: boolean;
  }): Promise<{ businesses: BusinessEntity[]; total: number }> {
    const supabase = this.getClient(false);
    if (!supabase) {
      if (filter?.includeDemo) return this.fallback.getBusinesses(filter);
      if (process.env.NODE_ENV === 'production') return { businesses: [], total: 0 };
      return this.fallback.getBusinesses(filter);
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
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error || !data) return this.fallback.getBusinesses(filter);

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
      return this.fallback.getBusinesses(filter);
    }
  }

  public async getBusinessById(id: string): Promise<BusinessEntity | null> {
    const supabase = this.getClient(false);
    if (!supabase) return process.env.NODE_ENV === 'production' ? null : this.fallback.getBusinessById(id);

    try {
      const { data, error } = await supabase.from('businesses').select('*').eq('id', id).single();
      if (error || !data) return process.env.NODE_ENV === 'production' ? null : this.fallback.getBusinessById(id);

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
      return this.fallback.getBusinessById(id);
    }
  }

  public async saveBusiness(b: BusinessEntity): Promise<void> {
    this.fallback.saveBusiness(b);
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
        country: b.country || 'US',
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
        is_archived: b.isArchived || false,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveBusiness error:', err);
    }
  }

  public async saveEvidence(businessId: string, evList: GrowthEvidenceEntity[]): Promise<void> {
    this.fallback.saveEvidence(businessId, evList);
    const supabase = this.getClient();
    if (!supabase || evList.length === 0) return;

    try {
      const rows = evList.map((ev) => ({
        id: ev.id,
        business_id: businessId,
        source_name: ev.sourceName,
        source_url: ev.sourceUrl,
        observation_time: ev.observationTime || new Date().toISOString(),
        evidence_type: ev.evidenceType,
        summary: ev.summary,
        is_factual: ev.isFactual ?? true,
        confidence: ev.confidence ?? 1.0,
        freshness_score: ev.freshnessScore ?? 1.0,
      }));
      await supabase.from('growth_evidence').upsert(rows);
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveEvidence error:', err);
    }
  }

  public async saveWebsiteCheck(check: WebsiteCheckEntity): Promise<void> {
    this.fallback.saveWebsiteCheck(check);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('website_checks').upsert({
        id: check.id,
        business_id: check.businessId,
        domain: check.domain,
        status: check.status,
        http_status_code: check.httpStatusCode,
        tls_valid: check.tlsValid,
        ip_address: check.ipAddress,
        is_private_ip: check.isPrivateIp ?? false,
        redirect_chain: check.redirectChain || [],
        social_urls: check.socialUrls || [],
        page_title: check.pageTitle,
        meta_description: check.metaDescription,
        verification_latency_ms: check.verificationLatencyMs,
        checked_at: check.checkedAt || new Date().toISOString(),
        error_details: check.errorDetails,
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveWebsiteCheck error:', err);
    }
  }

  public async saveLeadScore(score: LeadScoreEntity): Promise<void> {
    this.fallback.saveLeadScore(score);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('lead_scores').upsert({
        id: score.id,
        business_id: score.businessId,
        overall_score: score.overallScore,
        activity_score: score.activityScore,
        service_fit_score: score.serviceFitScore,
        website_opportunity_score: score.websiteOpportunityScore,
        ai_opportunity_score: score.aiOpportunityScore,
        contact_quality_score: score.contactQualityScore,
        confidence_score: score.confidenceScore,
        reasoning: score.reasoning,
        score_breakdown: score.scoreBreakdown || {},
        scored_at: score.scoredAt || new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveLeadScore error:', err);
    }
  }

  public async saveContact(contact: ContactEntity): Promise<void> {
    this.fallback.saveContact(contact);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('contacts').upsert({
        id: contact.id,
        business_id: contact.businessId,
        full_name: contact.fullName,
        first_name: contact.firstName,
        last_name: contact.lastName,
        title: contact.title,
        email: contact.email,
        normalized_email: contact.normalizedEmail,
        phone: contact.phone,
        linkedin_url: contact.linkedinUrl,
        confidence: contact.confidence ?? 0.8,
        verification_status: contact.verificationStatus || 'unverified',
        is_primary: contact.isPrimary ?? false,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveContact error:', err);
    }
  }

  // --- Drafts ---
  public async getDrafts(filter?: { status?: string; campaignId?: string; limit?: number; offset?: number; includeDemo?: boolean }): Promise<EmailDraftEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getDrafts(filter);

    try {
      let query = supabase.from('email_drafts').select('*').order('created_at', { ascending: false });
      if (filter?.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }
      if (filter?.campaignId) {
        query = query.eq('campaign_id', filter.campaignId);
      }

      const { data, error } = await query;
      if (error || !data) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getDrafts(filter);

      return data.map((d: any) => ({
        id: d.id,
        businessId: d.business_id,
        contactId: d.contact_id,
        campaignId: d.campaign_id,
        strategy: d.strategy,
        subjectLines: d.subject_lines || [],
        selectedSubject: d.selected_subject,
        emailBody: d.email_body,
        callToAction: d.call_to_action,
        serviceOffer: d.service_offer,
        researchSummary: d.research_summary,
        observations: d.observations || [],
        rationale: d.research_summary || 'Targeted strategic outreach',
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
      return this.fallback.getDrafts(filter);
    }
  }

  public async getDraftById(id: string): Promise<EmailDraftEntity | null> {
    const supabase = this.getClient(false);
    if (!supabase) return process.env.NODE_ENV === 'production' ? null : this.fallback.getDraftById(id);

    try {
      const { data, error } = await supabase.from('email_drafts').select('*').eq('id', id).single();
      if (error || !data) return process.env.NODE_ENV === 'production' ? null : this.fallback.getDraftById(id);

      return {
        id: data.id,
        businessId: data.business_id,
        contactId: data.contact_id,
        campaignId: data.campaign_id,
        strategy: data.strategy,
        subjectLines: data.subject_lines || [],
        selectedSubject: data.selected_subject,
        emailBody: data.email_body,
        callToAction: data.call_to_action,
        serviceOffer: data.service_offer,
        researchSummary: data.research_summary,
        observations: data.observations || [],
        rationale: data.research_summary || '',
        warnings: [],
        confidenceRating: 0.9,
        version: 1,
        qualityGatePassed: data.quality_gate_passed,
        status: data.status,
        approvedBy: data.approved_by,
        approvedAt: data.approved_at,
        sentAt: data.sent_at,
        gmailMessageId: data.gmail_message_id,
        deliveryStatus: data.delivery_status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getDraftById(id);
    }
  }

  public async saveDraft(draft: EmailDraftEntity): Promise<void> {
    this.fallback.saveDraft(draft);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('email_drafts').upsert({
        id: draft.id,
        business_id: draft.businessId,
        contact_id: draft.contactId || null,
        campaign_id: draft.campaignId || `camp_outreach_${new Date().toISOString().slice(0, 10)}`,
        strategy: draft.strategy,
        subject_lines: draft.subjectLines || [draft.selectedSubject],
        selected_subject: draft.selectedSubject,
        email_body: draft.emailBody,
        call_to_action: draft.callToAction,
        service_offer: draft.serviceOffer,
        research_summary: draft.researchSummary,
        observations: draft.observations || [],
        quality_gate_passed: draft.qualityGatePassed ?? true,
        status: draft.status,
        approved_by: draft.approvedBy,
        approved_at: draft.approvedAt,
        sent_at: draft.sentAt,
        gmail_message_id: draft.gmailMessageId,
        delivery_status: draft.deliveryStatus || 'draft',
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveDraft error:', err);
    }
  }

  public async updateDraftStatus(
    id: string, 
    status: 'draft' | 'approved' | 'rejected' | 'sent', 
    approvedBy?: string
  ): Promise<EmailDraftEntity | null> {
    const updated = this.fallback.updateDraftStatus(id, status, approvedBy);
    const supabase = this.getClient();
    if (!supabase) return updated;

    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'approved') {
        updates.approved_by = approvedBy || 'operator';
        updates.approved_at = new Date().toISOString();
      } else if (status === 'sent') {
        updates.sent_at = new Date().toISOString();
        updates.delivery_status = 'delivered';
      }

      await supabase.from('email_drafts').update(updates).eq('id', id);
    } catch (err) {
      console.warn('[SUPABASE_STORE] updateDraftStatus error:', err);
    }

    return updated;
  }

  // --- Campaigns ---
  public async getCampaigns(): Promise<CampaignEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getCampaigns();

    try {
      const { data, error } = await supabase.from('campaigns').select('*');
      if (error || !data) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getCampaigns();

      return data.map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        name: c.name,
        targetPipeline: c.target_pipeline,
        strategy: c.strategy,
        status: c.status,
        requiresApproval: c.requires_approval,
        dailyCap: c.daily_cap,
        sendingWindowStart: c.sending_window_start,
        sendingWindowEnd: c.sending_window_end,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    } catch {
      return this.fallback.getCampaigns();
    }
  }

  public async getCampaignById(id: string): Promise<CampaignEntity | null> {
    return this.fallback.getCampaignById(id);
  }

  public async saveCampaign(campaign: CampaignEntity): Promise<void> {
    this.fallback.saveCampaign(campaign);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('campaigns').upsert({
        id: campaign.id,
        organization_id: campaign.organizationId || '00000000-0000-0000-0000-000000000001',
        name: campaign.name,
        target_pipeline: campaign.targetPipeline,
        strategy: campaign.strategy,
        status: campaign.status,
        requires_approval: campaign.requiresApproval,
        daily_cap: campaign.dailyCap,
        sending_window_start: campaign.sendingWindowStart,
        sending_window_end: campaign.sendingWindowEnd,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveCampaign error:', err);
    }
  }

  // --- Suppression List ---
  public async getSuppressionList(): Promise<SuppressionEntry[]> {
    const supabase = this.getClient(false);
    if (!supabase) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getSuppressionList();

    try {
      const { data, error } = await supabase.from('suppression_list').select('*');
      if (error || !data) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getSuppressionList();

      return data.map((s: any) => ({
        id: s.id,
        organizationId: s.organization_id || '00000000-0000-0000-0000-000000000001',
        type: s.type,
        value: s.value,
        reason: s.reason,
        createdAt: s.created_at,
      }));
    } catch {
      return this.fallback.getSuppressionList();
    }
  }

  public async addSuppression(entry: SuppressionEntry): Promise<void> {
    this.fallback.addSuppression(entry);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('suppression_list').upsert({
        id: entry.id,
        organization_id: '00000000-0000-0000-0000-000000000001',
        type: entry.type,
        value: entry.value.toLowerCase().trim(),
        reason: entry.reason,
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] addSuppression error:', err);
    }
  }

  public async isSuppressed(emailOrDomain: string): Promise<boolean> {
    const supabase = this.getClient(false);
    if (!supabase) return process.env.NODE_ENV === 'production' ? false : this.fallback.isSuppressed(emailOrDomain);

    try {
      const val = emailOrDomain.toLowerCase().trim();
      const { data } = await supabase
        .from('suppression_list')
        .select('id')
        .eq('value', val)
        .limit(1);

      if (data && data.length > 0) return true;
      return this.fallback.isSuppressed(emailOrDomain);
    } catch {
      return this.fallback.isSuppressed(emailOrDomain);
    }
  }

  // --- Jobs ---
  public async getJobs(): Promise<AutomationJobEntity[]> {
    return this.fallback.getJobs();
  }

  public async saveJob(job: AutomationJobEntity): Promise<void> {
    this.fallback.saveJob(job);
  }

  public async updateJob(id: string, updates: Partial<AutomationJobEntity>): Promise<AutomationJobEntity | null> {
    return this.fallback.updateJob(id, updates);
  }

  // --- Operating Modes ---
  public getOperatingMode(): OperatingMode {
    return this.fallback.getOperatingMode();
  }

  public setOperatingMode(mode: OperatingMode): void {
    this.fallback.setOperatingMode(mode);
  }

  public isAutomationPaused(): boolean {
    return this.fallback.isAutomationPaused();
  }

  public setAutomationPaused(paused: boolean): void {
    this.fallback.setAutomationPaused(paused);
  }

  // --- Alternative Channels ---
  public async saveAlternativeChannel(channel: AlternativeChannelEntity): Promise<void> {
    this.fallback.saveAlternativeChannel(channel);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('alternative_channels').upsert({
        id: channel.id,
        organization_id: '00000000-0000-0000-0000-000000000001',
        business_id: channel.businessId,
        platform: channel.platform,
        profile_url: channel.profileUrl,
        handle_or_identifier: channel.handleOrIdentifier || null,
        source_name: channel.sourceName,
        source_url: channel.sourceUrl || null,
        is_usable: channel.isUsable ?? true,
        custom_pitch: channel.customPitch,
        status: channel.status,
        last_checked_at: channel.lastCheckedAt || new Date().toISOString(),
        contacted_at: channel.contactedAt || null,
        reminder_date: channel.reminderDate || null,
        notes: channel.notes || null,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveAlternativeChannel error:', err);
    }
  }

  public async getAlternativeChannels(businessId?: string): Promise<AlternativeChannelEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getAlternativeChannels(businessId);

    try {
      let query = supabase.from('alternative_channels').select('*');
      if (businessId) query = query.eq('business_id', businessId);

      const { data, error } = await query;
      if (error || !data) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getAlternativeChannels(businessId);

      return data.map((c: any) => ({
        id: c.id,
        businessId: c.business_id,
        businessName: '',
        country: 'US',
        platform: c.platform,
        profileUrl: c.profile_url,
        handleOrIdentifier: c.handle_or_identifier,
        sourceName: c.source_name,
        sourceUrl: c.source_url,
        isUsable: c.is_usable,
        customPitch: c.custom_pitch,
        status: c.status,
        lastCheckedAt: c.last_checked_at,
        contactedAt: c.contacted_at,
        reminderDate: c.reminder_date,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    } catch {
      return this.fallback.getAlternativeChannels(businessId);
    }
  }

  public async getAlternativeChannelById(id: string): Promise<AlternativeChannelEntity | null> {
    return this.fallback.getAlternativeChannelById(id);
  }

  public async updateAlternativeChannelStatus(
    channelId: string, 
    status?: AlternativeChannelStatus, 
    reminderDate?: string | null, 
    notes?: string | null,
    customPitch?: string
  ): Promise<boolean> {
    const res = this.fallback.updateAlternativeChannelStatus(channelId, status, reminderDate, notes, customPitch);
    const supabase = this.getClient();
    if (!supabase) return res;

    try {
      const updates: any = { updated_at: new Date().toISOString() };
      if (status) updates.status = status;
      if (reminderDate !== undefined) updates.reminder_date = reminderDate;
      if (notes !== undefined) updates.notes = notes;
      if (customPitch !== undefined) updates.custom_pitch = customPitch;
      await supabase.from('alternative_channels').update(updates).eq('id', channelId);
    } catch (err) {
      console.warn('[SUPABASE_STORE] updateAlternativeChannelStatus error:', err);
    }

    return res;
  }

  // --- Dashboard Queries ---
  public async getWorldwideLeads(filters?: any): Promise<BusinessEntity[]> {
    if (filters?.includeDemo) return this.fallback.getWorldwideLeads(filters);
    if (process.env.NODE_ENV === 'production' && !this.getClient(false)) return [];
    return this.fallback.getWorldwideLeads(filters);
  }

  public async getReadyForEmailLeads(options?: any): Promise<Array<any>> {
    if (options?.includeDemo) return this.fallback.getReadyForEmailLeads(options);
    if (process.env.NODE_ENV === 'production' && !this.getClient(false)) return [];
    return this.fallback.getReadyForEmailLeads(options);
  }

  public async getSentEmails(options?: any): Promise<Array<any>> {
    if (options?.includeDemo) return this.fallback.getSentEmails(options);
    if (process.env.NODE_ENV === 'production' && !this.getClient(false)) return [];
    return this.fallback.getSentEmails(options);
  }

  public async getOtherOutreachOpportunities(options?: any): Promise<Array<any>> {
    if (options?.includeDemo) return this.fallback.getOtherOutreachOpportunities(options);
    if (process.env.NODE_ENV === 'production' && !this.getClient(false)) return [];
    return this.fallback.getOtherOutreachOpportunities(options);
  }

  public async getEmailSentPlusOtherChannels(options?: any): Promise<Array<any>> {
    if (options?.includeDemo) return this.fallback.getEmailSentPlusOtherChannels(options);
    if (process.env.NODE_ENV === 'production' && !this.getClient(false)) return [];
    return this.fallback.getEmailSentPlusOtherChannels(options);
  }

  public async getNoEmailBusinesses(options?: any): Promise<Array<any>> {
    if (options?.includeDemo) return this.fallback.getNoEmailBusinesses(options);
    if (process.env.NODE_ENV === 'production' && !this.getClient(false)) return [];
    return this.fallback.getNoEmailBusinesses(options);
  }

  public async lockAllChannelsForBusiness(businessId: string, reason: string): Promise<void> {
    this.fallback.lockAllChannelsForBusiness(businessId, reason);
  }

  public async recordChannelContact(channelId: string, contactedAt?: string): Promise<void> {
    this.fallback.recordChannelContact(channelId, contactedAt);
  }

  // --- Postgres Distributed Locks (Anti-Overlap) ---
  public async acquireLock(name: string, ttlMs: number = 600000): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return this.fallback.acquireLock(name, ttlMs);

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

      // Check existing active lock
      const { data: existing } = await supabase
        .from('distributed_locks')
        .select('*')
        .eq('lock_name', name)
        .single();

      if (existing) {
        const existingExpires = new Date(existing.expires_at).getTime();
        if (existingExpires > now.getTime()) {
          // Lock held by active run
          return false;
        }
      }

      // Upsert lock
      const { error } = await supabase.from('distributed_locks').upsert({
        lock_name: name,
        locked_by: `cloud_runner_${process.env.VERCEL_GIT_COMMIT_SHA || 'instance'}`,
        acquired_at: now.toISOString(),
        expires_at: expiresAt,
      });

      return !error;
    } catch {
      return this.fallback.acquireLock(name, ttlMs);
    }
  }

  public async releaseLock(name: string): Promise<void> {
    this.fallback.releaseLock(name);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('distributed_locks').delete().eq('lock_name', name);
    } catch (err) {
      console.warn('[SUPABASE_STORE] releaseLock error:', err);
    }
  }

  // --- Checkpoints (Bounded Batch Resumption) ---
  public async saveCheckpoint(taskName: string, cursorData: any, itemsRemaining?: number): Promise<void> {
    this.fallback.saveCheckpoint(taskName, cursorData, itemsRemaining);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('scheduler_checkpoints').upsert({
        task_name: taskName,
        cursor_data: cursorData,
        items_remaining: itemsRemaining || 0,
        status: (itemsRemaining || 0) > 0 ? 'in_progress' : 'completed',
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] saveCheckpoint error:', err);
    }
  }

  public async getCheckpoint(taskName: string): Promise<any | null> {
    const supabase = this.getClient();
    if (!supabase) return this.fallback.getCheckpoint(taskName);

    try {
      const { data, error } = await supabase
        .from('scheduler_checkpoints')
        .select('*')
        .eq('task_name', taskName)
        .single();

      if (error || !data) return this.fallback.getCheckpoint(taskName);
      return {
        taskName: data.task_name,
        cursorData: data.cursor_data,
        cursor_data: data.cursor_data,
        itemsRemaining: data.items_remaining,
        status: data.status,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getCheckpoint(taskName);
    }
  }

  // --- Scheduler Run History ---
  public async recordSchedulerRun(run: any): Promise<void> {
    this.fallback.recordSchedulerRun(run);
    const supabase = this.getClient();
    if (!supabase) return;

    try {
      await supabase.from('scheduler_run_history').insert({
        run_id: run.runId,
        organization_id: '00000000-0000-0000-0000-000000000001',
        status: run.status,
        start_time_pkt: run.startTimePkt || '09:00 PKT',
        finish_time_pkt: run.finishTimePkt || '09:05 PKT',
        start_time_utc: run.startTimeUtc || new Date().toISOString(),
        finish_time_utc: run.finishTimeUtc || new Date().toISOString(),
        countries_searched: run.countriesSearched || ['US', 'UK'],
        sources_searched: run.sourcesSearched || ['Google Places', 'Companies House'],
        leads_discovered: run.leadsDiscovered || 0,
        leads_qualified: run.leadsQualified || 0,
        drafts_generated: run.draftsGenerated || 0,
        emails_sent: run.emailsSent || 0,
        skipped_records_count: run.skippedRecordsCount || 0,
        skipped_reasons: run.skippedReasons || {},
        alternative_channels_found: run.alternativeChannelsFound || 0,
        operating_mode: run.operatingMode || 'approval',
        reason: run.reason || null,
        duration_ms: run.durationMs || 0,
        next_scheduled_run_pkt: run.nextScheduledRunPkt || null,
        next_scheduled_run_utc: run.nextScheduledRunUtc || null,
        notification_status: run.notificationStatus || 'sent',
      });
    } catch (err) {
      console.warn('[SUPABASE_STORE] recordSchedulerRun error:', err);
    }
  }

  public async getSchedulerRuns(): Promise<any[]> {
    const supabase = this.getClient(false);
    if (!supabase) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getSchedulerRuns();

    try {
      const { data, error } = await supabase
        .from('scheduler_run_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) return process.env.NODE_ENV === 'production' ? [] : this.fallback.getSchedulerRuns();

      return data.map((r: any) => ({
        id: r.id,
        runId: r.run_id,
        status: r.status,
        startTimePkt: r.start_time_pkt,
        finishTimePkt: r.finish_time_pkt,
        startTimeUtc: r.start_time_utc,
        finishTimeUtc: r.finish_time_utc,
        leadsDiscovered: r.leads_discovered,
        leadsQualified: r.leads_qualified,
        draftsGenerated: r.drafts_generated,
        emailsSent: r.emails_sent,
        operatingMode: r.operating_mode,
        durationMs: r.duration_ms,
        createdAt: r.created_at,
      }));
    } catch {
      return this.fallback.getSchedulerRuns();
    }
  }

  public async getLastSchedulerRun(): Promise<any | null> {
    const supabase = this.getClient(false);
    if (!supabase) {
      if (process.env.NODE_ENV === 'production') return null;
      return this.fallback.getLastSchedulerRun();
    }

    try {
      const { data, error } = await supabase
        .from('scheduler_run_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return process.env.NODE_ENV === 'production' ? null : this.fallback.getLastSchedulerRun();

      return {
        id: data.id,
        runId: data.run_id,
        status: data.status,
        startTimePkt: data.start_time_pkt,
        finishTimePkt: data.finish_time_pkt,
        startTimeUtc: data.start_time_utc,
        finishTimeUtc: data.finish_time_utc,
        leadsDiscovered: data.leads_discovered,
        leadsQualified: data.leads_qualified,
        draftsGenerated: data.drafts_generated,
        emailsSent: data.emails_sent,
        operatingMode: data.operating_mode,
        durationMs: data.duration_ms,
        createdAt: data.created_at,
      };
    } catch {
      return process.env.NODE_ENV === 'production' ? null : this.fallback.getLastSchedulerRun();
    }
  }

  public async getPlatformStats(options?: any): Promise<any> {
    const supabase = this.getClient(false);
    if (!supabase && process.env.NODE_ENV === 'production') {
      if (options?.includeDemo) {
        return this.fallback.getPlatformStats(options);
      }
      return {
        totalBusinesses: 0,
        pipelineAOpportunities: 0,
        pipelineBOpportunities: 0,
        qualifiedTotal: 0,
        totalDrafts: 0,
        approvedDrafts: 0,
        sentCount: 0,
        confirmedDeliveries: 0,
        failuresCount: 0,
        repliesCount: 0,
        suppressionCount: 0,
        eligibleEmailContacts: 0,
        alternativeChannelsCount: 0,
        otherOutreachCount: 0,
        emailSentPlusChannelsCount: 0,
        noEmailCount: 0,
        activeCampaigns: 0,
        operatingMode: 'approval',
        automationPaused: false,
        lastSchedulerRun: null,
        timelineSentences: ['Nothing yet. Start by connecting your services.'],
      };
    }
    return this.fallback.getPlatformStats(options);
  }

  public seedDemoData(force = false): void {
    if (process.env.NODE_ENV === 'production' && !force) return;
    this.fallback.seedDemoData?.(force);
  }

  public clearDemoData(): void {
    this.fallback.clearDemoData?.();
  }

  public hasDemoData(): boolean {
    return this.fallback.hasDemoData?.() ?? false;
  }

  public resetToSeedData(): void {
    this.fallback.resetToSeedData();
  }

  public persistState(): void {
    this.fallback.persistState();
  }
}

export const supabaseDataStore = new SupabaseDataStore();
