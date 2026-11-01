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
  PlatformEntity,
  VettedApplicationEntity,
  LeadSourceConfigEntity,
  PlatformFootprintCandidate,
  MarketplaceHotRequestEntity,
  PlatformSpendLogEntity,
  PlatformTrackerEntity,
  PlatformDailyTargetEntity,
  OperatorProfileEntity,
  ClientRequestEntity,
  RequestPitchEntity,
  RequestChannelEntity,
  RequestEventEntity,
  LeadSourceEntity,
  RequestStatus,
  SourceStatus,
} from '@/types';
import { IDataStore } from './interface';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isDemoOrSandboxRecord } from './demo-guard';

export class SupabaseDataStore implements IDataStore {
  private demoModeActive: boolean = false;
  private fallbackStore?: any;

  constructor(fallbackStore?: any) {
    this.fallbackStore = fallbackStore;
  }

  private get fallback(): any {
    return this.fallbackStore;
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
      if (error || !data) {
        if (process.env.NODE_ENV === 'production') return { businesses: [], total: 0 };
        return this.fallback.getBusinesses(filter);
      }

      const businessIds = data.map((b: any) => b.id);
      const checksMap = new Map<string, any>();
      const scoresMap = new Map<string, any>();
      const contactsMap = new Map<string, any[]>();

      if (businessIds.length > 0) {
        try {
          const [checksRes, scoresRes, contactsRes] = await Promise.all([
            supabase.from('website_checks').select('*').in('business_id', businessIds),
            supabase.from('lead_scores').select('*').in('business_id', businessIds),
            supabase.from('contacts').select('*').in('business_id', businessIds),
          ]);
          if (checksRes.data) {
            for (const c of checksRes.data) checksMap.set(c.business_id, c);
          }
          if (scoresRes.data) {
            for (const s of scoresRes.data) scoresMap.set(s.business_id, s);
          }
          if (contactsRes.data) {
            for (const ct of contactsRes.data) {
              const arr = contactsMap.get(ct.business_id) || [];
              arr.push(ct);
              contactsMap.set(ct.business_id, arr);
            }
          }
        } catch {
          // ignore relation fetch errors and proceed
        }
      }

      let businesses: BusinessEntity[] = data.map((b: any) => {
        const check = checksMap.get(b.id);
        const score = scoresMap.get(b.id);
        const bContacts = contactsMap.get(b.id) || [];

        return {
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
          isDemo: b.is_demo ?? false,
          isSandboxData: b.is_sandbox_data ?? false,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          websiteCheck: check ? {
            id: check.id,
            businessId: check.business_id,
            domain: check.domain,
            status: check.status,
            httpStatusCode: check.http_status_code,
            tlsValid: check.tls_valid,
            ipAddress: check.ip_address,
            isPrivateIp: check.is_private_ip ?? false,
            socialUrls: check.social_urls || [],
            pageTitle: check.page_title,
            metaDescription: check.meta_description,
            checkedAt: check.checked_at,
          } : undefined,
          score: score ? {
            id: score.id,
            businessId: score.business_id,
            overallScore: score.overall_score,
            activityScore: score.activity_score,
            serviceFitScore: score.service_fit_score,
            websiteOpportunityScore: score.website_opportunity_score,
            aiOpportunityScore: score.ai_opportunity_score,
            contactQualityScore: score.contact_quality_score,
            confidenceScore: score.confidence_score,
            reasoning: score.reasoning,
            scoreBreakdown: score.score_breakdown || {},
            scoredAt: score.scored_at,
          } : undefined,
          contacts: bContacts.map((ct: any) => ({
            id: ct.id,
            businessId: ct.business_id,
            fullName: ct.full_name,
            firstName: ct.first_name,
            lastName: ct.last_name,
            title: ct.title,
            email: ct.email,
            phone: ct.phone,
            confidence: ct.confidence ?? 0.8,
            verificationStatus: ct.verification_status || 'unverified',
            isPrimary: ct.is_primary ?? false,
            createdAt: ct.created_at || new Date().toISOString(),
            updatedAt: ct.updated_at || new Date().toISOString(),
          })),
        };
      });

      if (!filter?.includeDemo) {
        businesses = businesses.filter(b => !isDemoOrSandboxRecord(b));
      }

      return { businesses, total: businesses.length };
    } catch {
      if (process.env.NODE_ENV === 'production') return { businesses: [], total: 0 };
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
    const supabase = this.getClient(false);
    if (!supabase) {
      if (process.env.NODE_ENV === 'production') return [];
      return this.fallback.getWorldwideLeads(filters);
    }

    try {
      const { businesses } = await this.getBusinesses({
        pipeline: filters?.pipeline,
        country: filters?.country,
        search: filters?.search,
        qualificationStatus: filters?.status,
        limit: filters?.limit || 1000,
        includeDemo: filters?.includeDemo,
      });

      let result = businesses;

      if (filters?.industry && filters.industry !== 'all') {
        const ind = filters.industry.toLowerCase();
        result = result.filter(b => b.industry?.toLowerCase().includes(ind));
      }

      if (filters?.minScore !== undefined) {
        result = result.filter(b => (b.score?.overallScore || 0) >= filters.minScore);
      }

      if (filters?.hasEmail !== undefined) {
        result = result.filter(b => {
          const has = Boolean(b.contacts && b.contacts.some(c => Boolean(c.email)));
          return filters.hasEmail ? has : !has;
        });
      }

      return result;
    } catch {
      if (process.env.NODE_ENV === 'production') return [];
      return this.fallback.getWorldwideLeads(filters);
    }
  }

  public async getReadyForEmailLeads(options?: any): Promise<Array<any>> {
    if (options?.includeDemo) return this.fallback.getReadyForEmailLeads(options);
    if (process.env.NODE_ENV === 'production' && !this.getClient(false)) return [];
    return this.fallback.getReadyForEmailLeads(options);
  }

  public async getSentEmails(options?: any): Promise<Array<any>> {
    const supabase = this.getClient(false);
    if (!supabase) {
      if (options?.includeDemo) return this.fallback.getSentEmails(options);
      if (process.env.NODE_ENV === 'production') return [];
      return this.fallback.getSentEmails(options);
    }

    try {
      let query = supabase
        .from('email_drafts')
        .select('*, businesses(*)')
        .or('delivery_status.eq.delivered,status.eq.sent');

      const { data, error } = await query;
      if (error || !data) return this.fallback.getSentEmails(options);

      return data.map((d: any) => ({
        id: d.id,
        businessId: d.business_id,
        businessName: d.businesses?.name || 'Unknown Business',
        recipientEmail: d.recipient_email,
        selectedSubject: d.selected_subject,
        emailBody: d.email_body,
        status: d.status,
        deliveryStatus: d.delivery_status,
        gmailMessageId: d.gmail_message_id,
        gmailThreadId: d.gmail_thread_id,
        gmailUrl: d.gmail_url,
        sentAt: d.sent_at,
        isDemo: d.is_demo || false,
      }));
    } catch {
      return this.fallback.getSentEmails(options);
    }
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
        reason: r.reason,
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
        reason: data.reason,
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

  public hasDemoData(): boolean {
    if (process.env.NODE_ENV === 'production') {
      return this.demoModeActive;
    }
    return this.fallback.hasDemoData?.() ?? false;
  }

  public async seedDemoData(force = false): Promise<void> {
    this.demoModeActive = true;
    if (this.fallback.seedDemoData) {
      await this.fallback.seedDemoData(force);
    }
  }

  public async clearDemoData(): Promise<void> {
    this.demoModeActive = false;
    if (this.fallback.clearDemoData) {
      await this.fallback.clearDemoData();
    }
  }

  public resetToSeedData(): void {
    this.fallback.resetToSeedData();
  }

  public persistState(): void {
    this.fallback.persistState();
  }
  // --- Platform Registry & Acquisition Engine ---
  public async getPlatforms(filters?: any): Promise<PlatformEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getPlatforms(filters);
    try {
      let q = supabase.from('platforms').select('*').order('priority', { ascending: true });
      if (filters?.category && filters.category !== 'all') q = q.eq('category', filters.category);
      if (filters?.priority && filters.priority !== 'all') q = q.eq('priority', filters.priority);
      if (filters?.pitchMode && filters.pitchMode !== 'all') q = q.eq('pitch_mode', filters.pitchMode);
      if (filters?.countryEligibility && filters.countryEligibility !== 'all') q = q.eq('country_eligibility_status', filters.countryEligibility);
      if (filters?.myAccountStatus && filters.myAccountStatus !== 'all') q = q.eq('my_account_status', filters.myAccountStatus);
      const { data, error } = await q;
      if (error || !data || data.length === 0) return this.fallback.getPlatforms(filters);
      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        url: d.url,
        officialTermsUrl: d.official_terms_url,
        howToGetClients: d.how_to_get_clients,
        aiMlRelevance: d.ai_ml_relevance,
        pitchMode: d.pitch_mode,
        integrationMode: d.integration_mode,
        priority: d.priority,
        costAccessNotes: d.cost_access_notes,
        practicalNote: d.practical_note,
        countryEligibilityStatus: d.country_eligibility_status,
        myAccountStatus: d.my_account_status,
        lastVerified: d.last_verified,
        isActive: d.is_active,
        notes: d.notes,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return this.fallback.getPlatforms(filters);
    }
  }

  public async getPlatformById(id: string): Promise<PlatformEntity | null> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getPlatformById(id);
    try {
      const { data, error } = await supabase.from('platforms').select('*').eq('id', id).maybeSingle();
      if (error || !data) return this.fallback.getPlatformById(id);
      return {
        id: data.id,
        name: data.name,
        category: data.category,
        url: data.url,
        officialTermsUrl: data.official_terms_url,
        howToGetClients: data.how_to_get_clients,
        aiMlRelevance: data.ai_ml_relevance,
        pitchMode: data.pitch_mode,
        integrationMode: data.integration_mode,
        priority: data.priority,
        costAccessNotes: data.cost_access_notes,
        practicalNote: data.practical_note,
        countryEligibilityStatus: data.country_eligibility_status,
        myAccountStatus: data.my_account_status,
        lastVerified: data.last_verified,
        isActive: data.is_active,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getPlatformById(id);
    }
  }

  public async savePlatform(platform: PlatformEntity): Promise<void> {
    this.fallback.savePlatform(platform);
    const supabase = this.getClient(true);
    if (!supabase) return;
    try {
      await supabase.from('platforms').upsert({
        id: platform.id,
        name: platform.name,
        category: platform.category,
        url: platform.url,
        official_terms_url: platform.officialTermsUrl,
        how_to_get_clients: platform.howToGetClients,
        ai_ml_relevance: platform.aiMlRelevance,
        pitch_mode: platform.pitchMode,
        integration_mode: platform.integrationMode,
        priority: platform.priority,
        cost_access_notes: platform.costAccessNotes,
        practical_note: platform.practicalNote,
        country_eligibility_status: platform.countryEligibilityStatus,
        my_account_status: platform.myAccountStatus,
        last_verified: platform.lastVerified,
        is_active: platform.isActive,
        notes: platform.notes,
      });
    } catch {}
  }

  public async updatePlatform(id: string, updates: Partial<PlatformEntity>): Promise<PlatformEntity | null> {
    const res = this.fallback.updatePlatform(id, updates);
    const supabase = this.getClient(true);
    if (!supabase) return res;
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.url !== undefined) payload.url = updates.url;
      if (updates.officialTermsUrl !== undefined) payload.official_terms_url = updates.officialTermsUrl;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.pitchMode !== undefined) payload.pitch_mode = updates.pitchMode;
      if (updates.integrationMode !== undefined) payload.integration_mode = updates.integrationMode;
      if (updates.countryEligibilityStatus !== undefined) payload.country_eligibility_status = updates.countryEligibilityStatus;
      if (updates.myAccountStatus !== undefined) payload.my_account_status = updates.myAccountStatus;
      if (updates.lastVerified !== undefined) payload.last_verified = updates.lastVerified;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      payload.updated_at = new Date().toISOString();
      await supabase.from('platforms').update(payload).eq('id', id);
    } catch {}
    return res;
  }

  public async verifyPlatformTerms(id: string, verifiedAt?: string): Promise<PlatformEntity | null> {
    return this.updatePlatform(id, {
      lastVerified: verifiedAt || new Date().toISOString(),
      notes: 'Terms verified by operator',
    });
  }

  // --- Vetted Applications Tracker (Group B) ---
  public async getVettedApplications(): Promise<VettedApplicationEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getVettedApplications();
    try {
      const { data, error } = await supabase.from('vetted_applications').select('*');
      if (error || !data || data.length === 0) return this.fallback.getVettedApplications();
      return data.map((d: any) => ({
        id: d.id,
        platformId: d.platform_id,
        platformName: d.platform_name,
        status: d.status,
        readinessScore: d.readiness_score,
        checklist: d.checklist || [],
        hasCv: d.has_cv,
        hasGithub: d.has_github,
        caseStudiesCount: d.case_studies_count,
        hasDemoVideo: d.has_demo_video,
        appliedDate: d.applied_date,
        nextActionDate: d.next_action_date,
        interviewNotes: d.interview_notes,
        pakistanCheck: d.pakistan_check || {},
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return this.fallback.getVettedApplications();
    }
  }

  public async getVettedApplicationById(id: string): Promise<VettedApplicationEntity | null> {
    return this.fallback.getVettedApplicationById(id);
  }

  public async saveVettedApplication(app: VettedApplicationEntity): Promise<void> {
    this.fallback.saveVettedApplication(app);
    const supabase = this.getClient(true);
    if (!supabase) return;
    try {
      await supabase.from('vetted_applications').upsert({
        id: app.id,
        platform_id: app.platformId,
        platform_name: app.platformName,
        status: app.status,
        readiness_score: app.readinessScore,
        checklist: app.checklist,
        has_cv: app.hasCv,
        has_github: app.hasGithub,
        case_studies_count: app.caseStudiesCount,
        has_demo_video: app.hasDemoVideo,
        applied_date: app.appliedDate,
        next_action_date: app.nextActionDate,
        interview_notes: app.interviewNotes,
        pakistan_check: app.pakistanCheck,
      });
    } catch {}
  }

  public async updateVettedApplication(id: string, updates: Partial<VettedApplicationEntity>): Promise<VettedApplicationEntity | null> {
    const res = this.fallback.updateVettedApplication(id, updates);
    const supabase = this.getClient(true);
    if (!supabase) return res;
    try {
      const payload: any = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.readinessScore !== undefined) payload.readiness_score = updates.readinessScore;
      if (updates.checklist !== undefined) payload.checklist = updates.checklist;
      if (updates.hasCv !== undefined) payload.has_cv = updates.hasCv;
      if (updates.hasGithub !== undefined) payload.has_github = updates.hasGithub;
      if (updates.caseStudiesCount !== undefined) payload.case_studies_count = updates.caseStudiesCount;
      if (updates.hasDemoVideo !== undefined) payload.has_demo_video = updates.hasDemoVideo;
      if (updates.appliedDate !== undefined) payload.applied_date = updates.appliedDate;
      if (updates.nextActionDate !== undefined) payload.next_action_date = updates.nextActionDate;
      if (updates.interviewNotes !== undefined) payload.interview_notes = updates.interviewNotes;
      if (updates.pakistanCheck !== undefined) payload.pakistan_check = updates.pakistanCheck;
      payload.updated_at = new Date().toISOString();
      await supabase.from('vetted_applications').update(payload).eq('platform_id', id);
    } catch {}
    return res;
  }

  // --- Lead Source Configs (Group C) ---
  public async getLeadSourceConfigs(): Promise<LeadSourceConfigEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getLeadSourceConfigs();
    try {
      const { data, error } = await supabase.from('lead_source_configs').select('*');
      if (error || !data || data.length === 0) return this.fallback.getLeadSourceConfigs();
      return data.map((d: any) => ({
        id: d.id,
        sourceName: d.source_name,
        monthlyCreditBudget: d.monthly_credit_budget,
        creditsUsedThisMonth: d.credits_used_this_month,
        status: d.status,
        lastTestedAt: d.last_tested_at,
        apiKeyConfigured: d.api_key_configured,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return this.fallback.getLeadSourceConfigs();
    }
  }

  public async saveLeadSourceConfig(config: LeadSourceConfigEntity): Promise<void> {
    this.fallback.saveLeadSourceConfig(config);
    const supabase = this.getClient(true);
    if (!supabase) return;
    try {
      await supabase.from('lead_source_configs').upsert({
        id: config.id,
        source_name: config.sourceName,
        monthly_credit_budget: config.monthlyCreditBudget,
        credits_used_this_month: config.creditsUsedThisMonth,
        status: config.status,
        last_tested_at: config.lastTestedAt,
        api_key_configured: config.apiKeyConfigured,
      });
    } catch {}
  }

  public async recordLeadSourceUsage(sourceName: string, creditsUsed: number = 1): Promise<void> {
    this.fallback.recordLeadSourceUsage(sourceName, creditsUsed);
  }

  // --- Platform Footprints ("Where else can I reach them?") ---
  public async getFootprintsForBusiness(businessId: string): Promise<PlatformFootprintCandidate[]> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getFootprintsForBusiness(businessId);
    try {
      const { data, error } = await supabase.from('platform_footprints').select('*').eq('business_id', businessId);
      if (error || !data || data.length === 0) return this.fallback.getFootprintsForBusiness(businessId);
      return data.map((d: any) => ({
        id: d.id,
        businessId: d.business_id,
        platform: d.platform,
        profileUrl: d.profile_url,
        source: d.source,
        verificationStatus: d.verification_status,
        confidence: Number(d.confidence),
        lastChecked: d.last_checked,
        notes: d.notes,
      }));
    } catch {
      return this.fallback.getFootprintsForBusiness(businessId);
    }
  }

  public async saveFootprint(footprint: PlatformFootprintCandidate): Promise<void> {
    this.fallback.saveFootprint(footprint);
    const supabase = this.getClient(true);
    if (!supabase) return;
    try {
      await supabase.from('platform_footprints').upsert({
        id: footprint.id,
        business_id: footprint.businessId,
        platform: footprint.platform,
        profile_url: footprint.profileUrl,
        source: footprint.source,
        verification_status: footprint.verificationStatus,
        confidence: footprint.confidence,
        last_checked: footprint.lastChecked,
        notes: footprint.notes,
      });
    } catch {}
  }

  public async deleteFootprint(id: string): Promise<void> {
    this.fallback.deleteFootprint(id);
    const supabase = this.getClient(true);
    if (!supabase) return;
    try {
      await supabase.from('platform_footprints').delete().eq('id', id);
    } catch {}
  }

  // --- Marketplace Hot Requests (Group A) ---
  public async getHotRequests(filters?: any): Promise<MarketplaceHotRequestEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getHotRequests(filters);
    try {
      let q = supabase.from('marketplace_hot_requests').select('*').order('fit_score', { ascending: false });
      if (filters?.platform && filters.platform !== 'all') q = q.eq('platform', filters.platform);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error || !data || data.length === 0) return this.fallback.getHotRequests(filters);
      return data.map((d: any) => ({
        id: d.id,
        platform: d.platform,
        title: d.title,
        description: d.description,
        postUrl: d.post_url,
        postType: d.post_type,
        fitScore: d.fit_score,
        freshnessHours: Number(d.freshness_hours),
        isScam: d.is_scam,
        budgetRange: d.budget_range,
        proposalDraft: d.proposal_draft,
        screeningAnswers: d.screening_answers || {},
        postedAt: d.posted_at,
        respondBefore: d.respond_before,
        status: d.status,
        createdAt: d.created_at,
      }));
    } catch {
      return this.fallback.getHotRequests(filters);
    }
  }

  public async saveHotRequest(request: MarketplaceHotRequestEntity): Promise<void> {
    this.fallback.saveHotRequest(request);
    const supabase = this.getClient(true);
    if (!supabase) return;
    try {
      await supabase.from('marketplace_hot_requests').upsert({
        id: request.id,
        platform: request.platform,
        title: request.title,
        description: request.description,
        post_url: request.postUrl,
        post_type: request.postType,
        fit_score: request.fitScore,
        freshness_hours: request.freshnessHours,
        is_scam: request.isScam,
        budget_range: request.budgetRange,
        proposal_draft: request.proposalDraft,
        screening_answers: request.screeningAnswers,
        posted_at: request.postedAt,
        respond_before: request.respondBefore,
        status: request.status,
      });
    } catch {}
  }

  public async updateHotRequestStatus(id: string, status: 'new' | 'proposal_copied' | 'submitted' | 'declined'): Promise<boolean> {
    const res = this.fallback.updateHotRequestStatus(id, status);
    const supabase = this.getClient(true);
    if (!supabase) return res;
    try {
      await supabase.from('marketplace_hot_requests').update({ status }).eq('id', id);
    } catch {}
    return res;
  }

  // --- Platform Spend Logs ---
  public async getPlatformSpendLogs(platformId?: string): Promise<PlatformSpendLogEntity[]> {
    return this.fallback.getPlatformSpendLogs(platformId);
  }

  public async recordPlatformSpend(spend: PlatformSpendLogEntity): Promise<void> {
    this.fallback.recordPlatformSpend(spend);
    const supabase = this.getClient(true);
    if (!supabase) return;
    try {
      await supabase.from('platform_spend_logs').insert({
        id: spend.id,
        platform_id: spend.platformId,
        platform_name: spend.platformName,
        cost_type: spend.costType,
        amount_spent: spend.amountSpent,
        currency: spend.currency,
        notes: spend.notes,
        logged_at: spend.loggedAt,
      });
    } catch {}
  }
  // Platform Trackers & Targets
  public async getPlatformTracker(platformId: string): Promise<PlatformTrackerEntity | undefined> {
    const trackers = await this.getPlatformTrackers();
    return trackers[platformId];
  }

  public async getPlatformTrackers(): Promise<Record<string, PlatformTrackerEntity>> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getPlatformTrackers();
    try {
      const { data, error } = await supabase.from('platform_tracker').select('*');
      if (error || !data) return this.fallback.getPlatformTrackers();
      const map: Record<string, PlatformTrackerEntity> = {};
      for (const row of data) {
        map[row.platform_id] = {
          id: row.id,
          platformId: row.platform_id,
          status: row.status,
          myProfileUrl: row.my_profile_url,
          notes: row.notes,
          lastActionDate: row.last_action_date,
          followUpDate: row.follow_up_date,
          checklist: row.checklist,
          customPitch: row.custom_pitch,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
      return map;
    } catch {
      return this.fallback.getPlatformTrackers();
    }
  }

  public async savePlatformTracker(tracker: Partial<PlatformTrackerEntity> & { platformId: string }): Promise<PlatformTrackerEntity> {
    const fallbackRes = await this.fallback.savePlatformTracker(tracker);
    const supabase = this.getClient(true);
    if (!supabase) return fallbackRes;
    try {
      const id = tracker.id || fallbackRes.id;
      const row = {
        id,
        platform_id: tracker.platformId,
        status: tracker.status || fallbackRes.status,
        my_profile_url: tracker.myProfileUrl !== undefined ? tracker.myProfileUrl : fallbackRes.myProfileUrl,
        notes: tracker.notes !== undefined ? tracker.notes : fallbackRes.notes,
        last_action_date: tracker.lastActionDate || fallbackRes.lastActionDate,
        follow_up_date: tracker.followUpDate !== undefined ? tracker.followUpDate : fallbackRes.followUpDate,
        checklist: tracker.checklist || fallbackRes.checklist,
        custom_pitch: tracker.customPitch !== undefined ? tracker.customPitch : fallbackRes.customPitch,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('platform_tracker').upsert(row);
      return fallbackRes;
    } catch {
      return fallbackRes;
    }
  }

  public async getDailyTarget(dateStr?: string): Promise<PlatformDailyTargetEntity> {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getDailyTarget(today);
    try {
      const { data, error } = await supabase
        .from('platform_daily_targets')
        .select('*')
        .eq('target_date', today)
        .maybeSingle();
      if (error || !data) return this.fallback.getDailyTarget(today);
      return {
        id: data.id,
        targetDate: data.target_date,
        targetCount: data.target_count,
        completedCount: data.completed_count,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getDailyTarget(today);
    }
  }

  public async incrementDailyProposals(dateStr?: string): Promise<PlatformDailyTargetEntity> {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const target = await this.fallback.incrementDailyProposals(today);
    const supabase = this.getClient(true);
    if (!supabase) return target;
    try {
      await supabase.from('platform_daily_targets').upsert({
        id: target.id,
        target_date: target.targetDate,
        target_count: target.targetCount,
        completed_count: target.completedCount,
        updated_at: target.updatedAt,
      });
      return target;
    } catch {
      return target;
    }
  }

  public async getOperatorProfile(): Promise<OperatorProfileEntity> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getOperatorProfile();
    try {
      const { data, error } = await supabase
        .from('operator_profile')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      if (error || !data) return this.fallback.getOperatorProfile();
      return {
        id: data.id,
        name: data.name,
        headline: data.headline,
        services: data.services,
        portfolioLinks: data.portfolio_links,
        bio: data.bio,
        yearsOfExperience: data.years_of_experience,
        rateRange: data.rate_range,
        availability: data.availability,
        languages: data.languages,
        timezone: data.timezone,
        demoModeEnabled: data.demo_mode_enabled,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getOperatorProfile();
    }
  }

  public async saveOperatorProfile(profile: Partial<OperatorProfileEntity>): Promise<OperatorProfileEntity> {
    const fallbackRes = await this.fallback.saveOperatorProfile(profile);
    const supabase = this.getClient(true);
    if (!supabase) return fallbackRes;
    try {
      await supabase.from('operator_profile').upsert({
        id: 'default',
        name: fallbackRes.name,
        headline: fallbackRes.headline,
        services: fallbackRes.services,
        portfolio_links: fallbackRes.portfolioLinks,
        bio: fallbackRes.bio,
        years_of_experience: fallbackRes.yearsOfExperience,
        rate_range: fallbackRes.rateRange,
        availability: fallbackRes.availability,
        languages: fallbackRes.languages,
        timezone: fallbackRes.timezone,
        demo_mode_enabled: fallbackRes.demoModeEnabled,
        updated_at: new Date().toISOString(),
      });
      return fallbackRes;
    } catch {
      return fallbackRes;
    }
  }

  public getDiscoveryCache(key: string, maxAgeMs?: number): any[] | null {
    if (this.fallback && typeof this.fallback.getDiscoveryCache === 'function') {
      return this.fallback.getDiscoveryCache(key, maxAgeMs);
    }
    return null;
  }

  public saveDiscoveryCache(key: string, results: any[]): void {
    if (this.fallback && typeof this.fallback.saveDiscoveryCache === 'function') {
      this.fallback.saveDiscoveryCache(key, results);
    }
  }

  // --- Client Requests & Sources ---
  public async getClientRequests(filters?: {
    platform?: string;
    status?: string;
    minScore?: number;
    hasEmail?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ClientRequestEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getClientRequests(filters);

    try {
      let query = supabase.from('client_requests').select('*');

      if (filters?.platform && filters.platform !== 'all') {
        query = query.eq('source_platform', filters.platform);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.minScore !== undefined) {
        query = query.gte('match_score', filters.minScore);
      }
      if (filters?.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,person_name.ilike.%${filters.search}%,need_summary.ilike.%${filters.search}%,quote.ilike.%${filters.search}%`);
      }

      const limit = filters?.limit || 100;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1).order('found_at', { ascending: false });

      const { data, error } = await query;
      if (error || !data) {
        return this.fallback.getClientRequests(filters);
      }

      const requestIds = data.map((r: any) => r.id);
      let pitchesMap = new Map<string, RequestPitchEntity[]>();
      let channelsMap = new Map<string, RequestChannelEntity[]>();

      if (requestIds.length > 0) {
        try {
          const [pitchesRes, channelsRes] = await Promise.all([
            supabase.from('request_pitches').select('*').in('request_id', requestIds),
            supabase.from('request_channels').select('*').in('request_id', requestIds),
          ]);
          if (pitchesRes.data) {
            for (const p of pitchesRes.data) {
              const list = pitchesMap.get(p.request_id) || [];
              list.push({
                id: p.id,
                requestId: p.request_id,
                channelType: p.channel_type,
                variant: p.variant,
                subject: p.subject,
                text: p.text,
                editedText: p.edited_text,
                readAloudPassed: p.read_aloud_passed,
                generatedAt: p.generated_at,
              });
              pitchesMap.set(p.request_id, list);
            }
          }
          if (channelsRes.data) {
            for (const c of channelsRes.data) {
              const list = channelsMap.get(c.request_id) || [];
              list.push({
                id: c.id,
                requestId: c.request_id,
                type: c.type,
                label: c.label,
                value: c.value,
                verified: c.verified,
                publicSourceUrl: c.public_source_url,
                createdAt: c.created_at,
              });
              channelsMap.set(c.request_id, list);
            }
          }
        } catch {
          // non-critical join failure
        }
      }

      let results: ClientRequestEntity[] = data.map((r: any) => ({
        id: r.id,
        sourcePlatform: r.source_platform,
        sourceUrl: r.source_url,
        sourcePostId: r.source_post_id,
        postUrl: r.post_url,
        quote: r.quote,
        needSummary: r.need_summary,
        matchScore: r.match_score,
        serviceFit: r.service_fit,
        status: r.status,
        foundAt: r.found_at,
        personName: r.person_name,
        companyName: r.company_name,
        platformUsername: r.platform_username,
        platformProfileUrl: r.platform_profile_url,
        companyWebsite: r.company_website,
        companyProfileUrl: r.company_profile_url,
        budget: r.budget,
        urgencySignals: r.urgency_signals,
        captureMethod: r.capture_method,
        companyId: r.company_id,
        evidence: r.evidence,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        pitches: pitchesMap.get(r.id) || [],
        channels: channelsMap.get(r.id) || [],
      }));

      if (filters?.hasEmail) {
        results = results.filter(r => r.channels && r.channels.some(c => c.type === 'email'));
      }

      return results;
    } catch {
      return this.fallback.getClientRequests(filters);
    }
  }

  public async getClientRequestById(id: string): Promise<ClientRequestEntity | null> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getClientRequestById(id);

    try {
      const { data, error } = await supabase
        .from('client_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return this.fallback.getClientRequestById(id);

      const [pitchesRes, channelsRes] = await Promise.all([
        supabase.from('request_pitches').select('*').eq('request_id', id),
        supabase.from('request_channels').select('*').eq('request_id', id),
      ]);

      const pitches: RequestPitchEntity[] = (pitchesRes.data || []).map((p: any) => ({
        id: p.id,
        requestId: p.request_id,
        channelType: p.channel_type,
        variant: p.variant,
        subject: p.subject,
        text: p.text,
        editedText: p.edited_text,
        readAloudPassed: p.read_aloud_passed,
        generatedAt: p.generated_at,
      }));

      const channels: RequestChannelEntity[] = (channelsRes.data || []).map((c: any) => ({
        id: c.id,
        requestId: c.request_id,
        type: c.type,
        label: c.label,
        value: c.value,
        verified: c.verified,
        publicSourceUrl: c.public_source_url,
        createdAt: c.created_at,
      }));

      return {
        id: data.id,
        sourcePlatform: data.source_platform,
        sourceUrl: data.source_url,
        sourcePostId: data.source_post_id,
        postUrl: data.post_url,
        quote: data.quote,
        needSummary: data.need_summary,
        matchScore: data.match_score,
        serviceFit: data.service_fit,
        status: data.status,
        foundAt: data.found_at,
        personName: data.person_name,
        companyName: data.company_name,
        platformUsername: data.platform_username,
        platformProfileUrl: data.platform_profile_url,
        companyWebsite: data.company_website,
        companyProfileUrl: data.company_profile_url,
        budget: data.budget,
        urgencySignals: data.urgency_signals,
        captureMethod: data.capture_method,
        companyId: data.company_id,
        evidence: data.evidence,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        pitches,
        channels,
      };
    } catch {
      return this.fallback.getClientRequestById(id);
    }
  }

  public async saveClientRequest(request: ClientRequestEntity): Promise<void> {
    if (this.fallback) {
      await this.fallback.saveClientRequest(request);
    }
    const supabase = this.getClient(true);
    if (!supabase) return;

    try {
      await supabase.from('client_requests').upsert({
        id: request.id,
        source_platform: request.sourcePlatform,
        source_url: request.sourceUrl,
        source_post_id: request.sourcePostId || null,
        post_url: request.postUrl,
        quote: request.quote,
        need_summary: request.needSummary,
        match_score: request.matchScore,
        service_fit: request.serviceFit,
        status: request.status,
        found_at: request.foundAt || new Date().toISOString(),
        person_name: request.personName || null,
        company_name: request.companyName || null,
        platform_username: request.platformUsername || null,
        platform_profile_url: request.platformProfileUrl || null,
        company_website: request.companyWebsite || null,
        company_profile_url: request.companyProfileUrl || null,
        budget: request.budget || null,
        urgency_signals: request.urgencySignals || null,
        capture_method: request.captureMethod || 'auto_feed',
        company_id: request.companyId || null,
        evidence: request.evidence || [],
        updated_at: new Date().toISOString(),
      });

      if (request.pitches && request.pitches.length > 0) {
        for (const p of request.pitches) {
          await this.saveRequestPitch(p);
        }
      }
      if (request.channels && request.channels.length > 0) {
        for (const c of request.channels) {
          await this.saveRequestChannel(c);
        }
      }
    } catch (e) {
      // fallback already saved
    }
  }

  public async updateClientRequestStatus(id: string, status: RequestStatus): Promise<boolean> {
    if (this.fallback) {
      await this.fallback.updateClientRequestStatus(id, status);
    }
    const supabase = this.getClient(true);
    if (!supabase) return true;

    try {
      await supabase
        .from('client_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      return true;
    } catch {
      return true;
    }
  }

  public async saveRequestPitch(pitch: RequestPitchEntity): Promise<void> {
    if (this.fallback) {
      await this.fallback.saveRequestPitch(pitch);
    }
    const supabase = this.getClient(true);
    if (!supabase) return;

    try {
      await supabase.from('request_pitches').upsert({
        id: pitch.id,
        request_id: pitch.requestId,
        channel_type: pitch.channelType,
        variant: pitch.variant,
        subject: pitch.subject || null,
        text: pitch.text,
        edited_text: pitch.editedText || null,
        read_aloud_passed: pitch.readAloudPassed ?? true,
        generated_at: pitch.generatedAt || new Date().toISOString(),
      });
    } catch {
      // fallback saved
    }
  }

  public async saveRequestChannel(channel: RequestChannelEntity): Promise<void> {
    if (this.fallback) {
      await this.fallback.saveRequestChannel(channel);
    }
    const supabase = this.getClient(true);
    if (!supabase) return;

    try {
      await supabase.from('request_channels').upsert({
        id: channel.id,
        request_id: channel.requestId,
        type: channel.type,
        label: channel.label,
        value: channel.value,
        verified: channel.verified ?? false,
        public_source_url: channel.publicSourceUrl || null,
        created_at: channel.createdAt || new Date().toISOString(),
      });
    } catch {
      // fallback saved
    }
  }

  public async recordRequestEvent(event: RequestEventEntity): Promise<void> {
    if (this.fallback) {
      await this.fallback.recordRequestEvent(event);
    }
    const supabase = this.getClient(true);
    if (!supabase) return;

    try {
      await supabase.from('request_events').insert({
        id: event.id,
        request_id: event.requestId,
        event_type: event.eventType,
        notes: event.notes || null,
        created_at: event.createdAt || new Date().toISOString(),
      });
    } catch {
      // fallback saved
    }
  }

  public async getLeadSources(filters?: { accessTier?: string; category?: string; status?: string }): Promise<LeadSourceEntity[]> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getLeadSources(filters);

    try {
      let query = supabase.from('lead_sources').select('*');
      if (filters?.accessTier && filters.accessTier !== 'all') {
        query = query.eq('access_tier', filters.accessTier);
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return this.fallback.getLeadSources(filters);
      }

      return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        domain: s.domain,
        category: s.category,
        accessTier: s.access_tier,
        method: s.method,
        termsNote: s.terms_note,
        status: s.status,
        lastChecked: s.last_checked,
        lastSuccess: s.last_success,
        notes: s.notes,
        pitchStyle: s.pitch_style,
        channelRules: s.channel_rules,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    } catch {
      return this.fallback.getLeadSources(filters);
    }
  }

  public async getLeadSourceById(id: string): Promise<LeadSourceEntity | null> {
    const supabase = this.getClient(false);
    if (!supabase) return this.fallback.getLeadSourceById(id);

    try {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return this.fallback.getLeadSourceById(id);

      return {
        id: data.id,
        name: data.name,
        domain: data.domain,
        category: data.category,
        accessTier: data.access_tier,
        method: data.method,
        termsNote: data.terms_note,
        status: data.status,
        lastChecked: data.last_checked,
        lastSuccess: data.last_success,
        notes: data.notes,
        pitchStyle: data.pitch_style,
        channelRules: data.channel_rules,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getLeadSourceById(id);
    }
  }

  public async saveLeadSource(source: LeadSourceEntity): Promise<void> {
    if (this.fallback) {
      await this.fallback.saveLeadSource(source);
    }
    const supabase = this.getClient(true);
    if (!supabase) return;

    try {
      await supabase.from('lead_sources').upsert({
        id: source.id,
        name: source.name,
        domain: source.domain,
        category: source.category,
        access_tier: source.accessTier,
        method: source.method,
        terms_note: source.termsNote,
        status: source.status,
        last_checked: source.lastChecked || null,
        last_success: source.lastSuccess || null,
        notes: source.notes || null,
        pitch_style: source.pitchStyle,
        channel_rules: source.channelRules || {},
        updated_at: new Date().toISOString(),
      });
    } catch {
      // fallback saved
    }
  }

  public async updateLeadSourceStatus(id: string, status: SourceStatus, lastChecked?: string, lastError?: string): Promise<void> {
    if (this.fallback) {
      await this.fallback.updateLeadSourceStatus(id, status, lastChecked, lastError);
    }
    const supabase = this.getClient(true);
    if (!supabase) return;

    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (lastChecked) updates.last_checked = lastChecked;
      if (status === 'verified_api' || status === 'manual_only') {
        updates.last_success = lastChecked || new Date().toISOString();
      }
      if (lastError) updates.notes = lastError;

      await supabase.from('lead_sources').update(updates).eq('id', id);
    } catch {
      // fallback saved
    }
  }


}

export const supabaseDataStore = new SupabaseDataStore();
