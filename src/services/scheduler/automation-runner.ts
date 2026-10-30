import { dataStore } from '../repository/data-store';
import { discoveryService } from '../discovery/discovery-service';
import { verifyWebsite } from '../website/verifier';
import { icpEngine } from '../scoring/icp-engine';
import { outreachService } from '../ai/outreach-service';
import { emailService } from '../email/email-service';
import { runNotifierService } from '../notifications/run-notifier';
import { normalizeBusinessName, isDuplicateBusiness } from '../crm/normalization';
import { autoSendGuard } from '../email/auto-send-guard';
import { gmailInboxSyncService } from '../email/gmail-inbox-sync';
import { generatePlatformPitch } from '../ai/platform-pitch-generator';
import { AlternativeChannelEntity, SchedulerRunHistoryEntity, GrowthEvidenceEntity } from '@/types';
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
  checkpoint?: any;
}

const TARGET_MARKETS = ['US', 'UK', 'CA', 'AU'];
const TARGET_INDUSTRIES = [
  'Software & Technology Services',
  'Dental & Healthcare Clinics',
  'Home & Commercial Services',
  'Legal & Financial Services',
  'E-commerce & Logistics',
];

export class AutomationRunner {
  private readonly LOCK_NAME = 'scheduler_global_run_lock';

  /**
   * Primary entry point for scheduled runs (09:00 & 17:00 PKT / 04:00 & 12:00 UTC)
   * or manual dashboard 'Run Now' invocations.
   * Runs autonomously in cloud serverless environment even with local laptop off.
   */
  public async executeScheduledRun(
    triggeredBy: string = 'scheduler', 
    currentHourOverride?: number,
    modeOverride?: string
  ): Promise<ScheduledRunResult> {
    const startTime = Date.now();
    const runId = `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 1. Acquire distributed Postgres lock to prevent overlapping cloud runs
    const acquired = await dataStore.acquireLock(this.LOCK_NAME, 600000); // 10 min TTL
    if (!acquired) {
      return {
        runId,
        status: 'skipped',
        leadsDiscovered: 0,
        leadsQualified: 0,
        draftsGenerated: 0,
        emailsSent: 0,
        operatingMode: dataStore.getOperatingMode(),
        reason: 'Another automation run is currently in progress. Overlapping invocation skipped via distributed lock.',
        durationMs: Date.now() - startTime,
      };
    }

    try {
      // 2. Watchdog: check for 14-hour scheduler inactivity
      const lastRun = await dataStore.getLastSchedulerRun();
      if (lastRun && (lastRun.finishTimeUtc || lastRun.startTimeUtc)) {
        const lastRunTs = new Date(lastRun.finishTimeUtc || lastRun.startTimeUtc).getTime();
        const hoursInactive = Number(((Date.now() - lastRunTs) / (1000 * 60 * 60)).toFixed(1));
        if (hoursInactive > 14) {
          console.warn(`[SCHEDULER WATCHDOG] Alert: Scheduler was inactive for ${hoursInactive} hours.`);
          runNotifierService
            .sendSchedulerInactivityAlert(hoursInactive, lastRun.finishTimeUtc || lastRun.startTimeUtc)
            .catch((err) => console.warn('[SCHEDULER WATCHDOG] Failed to dispatch inactivity alert:', err));
        }
      }

      // 3. Check Global Pause Switch
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
        await dataStore.recordSchedulerRun(result);
        return result;
      }

      // Pre-run Inbox Sync: detect client replies, bounces, and opt-outs before dispatching
      try {
        await gmailInboxSyncService.syncInbox();
      } catch (inboxErr) {
        console.warn('[SCHEDULER] Inbox sync notice (non-fatal):', inboxErr);
      }

      const operatingMode = (modeOverride as any) || dataStore.getOperatingMode();
      let totalDiscovered = 0;
      let totalQualified = 0;
      let totalDrafts = 0;
      let totalSent = 0;
      let totalChannelsFound = 0;
      let skippedRecordsCount = 0;
      const skippedReasons: Record<string, number> = {};
      const businessesEmailedWithOtherChannels: Array<{
        businessName: string;
        email: string;
        channels: string[];
        businessId: string;
      }> = [];
      const blockedAutoSends: Array<{
        businessName: string;
        email: string;
        reason: string;
      }> = [];
      const manualOutreachOpportunities: Array<{
        businessName: string;
        channels: string[];
        score: number;
        businessId: string;
        pitches?: Record<string, string>;
      }> = [];

      // 4. Load Postgres Checkpoint for Bounded Batching & Resumption
      const checkpoint = await dataStore.getCheckpoint('discovery_pipeline');
      const cursor = checkpoint?.cursorData || checkpoint?.cursor_data || { marketIndex: 0, industryIndex: 0, offset: 0 };

      const currentMarket = TARGET_MARKETS[cursor.marketIndex % TARGET_MARKETS.length];
      const currentIndustry = TARGET_INDUSTRIES[cursor.industryIndex % TARGET_INDUSTRIES.length];

      // 5. Bounded Multi-Market Discovery (capped per run to stay safely within cloud timeouts)
      const discoveryResult = await discoveryService.executeDiscovery({
        market: currentMarket as any,
        targetPipeline: 'both',
        industry: currentIndustry,
        provider: 'auto',
        limit: 10,
        keywords: ['AI', 'Python', 'Web', 'Automation', 'LLM'],
      });

      totalDiscovered = discoveryResult.leads.length;

      // Retrieve existing businesses for deduplication
      const existingRes = await dataStore.getBusinesses({ limit: 500 });
      const existingBusinesses = existingRes.businesses || [];

      for (const raw of discoveryResult.leads) {
        const normName = normalizeBusinessName(raw.name);

        // Deduplication against previously discovered / contacted businesses
        const isDup = existingBusinesses.some((b) =>
          isDuplicateBusiness(
            { normalizedName: normName, normalizedDomain: raw.domain, phone: raw.phone, city: raw.city },
            b
          )
        );

        if (isDup) {
          skippedRecordsCount++;
          skippedReasons['Duplicate business already exists'] =
            (skippedReasons['Duplicate business already exists'] || 0) + 1;
          continue;
        }

        const bizId = crypto.randomUUID();
        const newBiz: any = {
          id: bizId,
          organizationId: '00000000-0000-0000-0000-000000000001',
          name: raw.name,
          normalizedName: normName,
          domain: raw.domain || null,
          normalizedDomain: raw.domain ? raw.domain.toLowerCase() : null,
          country: raw.country || currentMarket,
          region: raw.region,
          city: raw.city,
          postalCode: raw.postalCode,
          address: raw.address,
          phone: raw.phone,
          industry: raw.industry || currentIndustry,
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

        await dataStore.saveBusiness(newBiz);

        // Save Evidence
        let evList: GrowthEvidenceEntity[] = [];
        if (raw.evidence && raw.evidence.length > 0) {
          evList = raw.evidence.map((ev) => ({
            id: crypto.randomUUID(),
            businessId: bizId,
            sourceName: ev.sourceName,
            sourceUrl: ev.sourceUrl,
            observationTime: ev.observationTime || new Date().toISOString(),
            evidenceType: ev.evidenceType,
            summary: ev.summary,
            isFactual: ev.isFactual ?? true,
            confidence: ev.confidence ?? 1.0,
            freshnessScore: 1.0,
            createdAt: new Date().toISOString(),
          }));
          await dataStore.saveEvidence(bizId, evList);
        }

        // SSRF-safe Website Verification
        const webCheckResult = await verifyWebsite({
          domain: raw.domain,
          socialUrls: raw.socialUrls,
          businessName: raw.name,
        });

        await dataStore.saveWebsiteCheck({
          id: crypto.randomUUID(),
          businessId: bizId,
          domain: raw.domain,
          status: webCheckResult.status,
          httpStatusCode: webCheckResult.httpStatusCode,
          tlsValid: webCheckResult.tlsValid,
          ipAddress: webCheckResult.ipAddress,
          isPrivateIp: webCheckResult.isPrivateIp,
          redirectChain: webCheckResult.redirectChain,
          socialUrls: raw.socialUrls || [],
          pageTitle: webCheckResult.pageTitle,
          metaDescription: webCheckResult.metaDescription,
          verificationLatencyMs: webCheckResult.verificationLatencyMs,
          checkedAt: new Date().toISOString(),
          errorDetails: webCheckResult.errorDetails,
        });

        // ICP Scoring
        const scored = icpEngine.evaluateLead({
          business: newBiz,
          evidence: evList,
          websiteCheck: webCheckResult as any,
          contacts: (raw.contacts as any) || [],
        });

        newBiz.pipelineType = scored.targetPipeline;
        newBiz.qualificationStatus = scored.overallScore >= 60 ? 'qualified' : 'unreviewed';
        await dataStore.saveBusiness(newBiz);

        await dataStore.saveLeadScore({
          id: crypto.randomUUID(),
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
        let primaryContact: any = null;
        if (raw.contacts && raw.contacts.length > 0) {
          for (const c of raw.contacts) {
            const contactId = crypto.randomUUID();
            const contactObj = {
              id: contactId,
              businessId: bizId,
              fullName: c.fullName,
              firstName: c.firstName,
              lastName: c.lastName,
              title: c.title,
              email: c.email,
              normalizedEmail: c.email ? c.email.toLowerCase() : null,
              phone: c.phone,
              linkedinUrl: c.linkedinUrl,
              confidence: c.confidence ?? 0.8,
              verificationStatus: c.verificationStatus || 'unverified',
              isPrimary: c.isPrimary ?? false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await dataStore.saveContact(contactObj);
            if (!primaryContact) primaryContact = contactObj;
          }
        }

        // 6. Extract & Save Alternative Channels
        const channelsForBiz: string[] = [];
        const channelPitches: Record<string, string> = {};
        if (raw.socialUrls && raw.socialUrls.length > 0) {
          for (const sUrl of raw.socialUrls) {
            let platform: any = 'other';
            if (sUrl.includes('linkedin.com')) platform = 'linkedin';
            else if (sUrl.includes('instagram.com')) platform = 'instagram';
            else if (sUrl.includes('facebook.com')) platform = 'facebook';
            else if (sUrl.includes('twitter.com') || sUrl.includes('x.com')) platform = 'twitter';
            else if (sUrl.includes('youtube.com')) platform = 'youtube';

            const chId = crypto.randomUUID();
            const pitchGen = generatePlatformPitch({
              business: newBiz,
              platform,
              profileUrl: sUrl,
              sourceType: 'google_places',
              verifiedObservation: evList[0]?.summary,
              serviceOffer: scored.targetPipeline === 'website_opportunities'
                ? 'custom modern web application development with automated client intake'
                : 'custom Python AI automation and LLM workflow pipelines',
            });

            await dataStore.saveAlternativeChannel({
              id: chId,
              businessId: bizId,
              businessName: raw.name,
              country: raw.country || currentMarket,
              platform,
              profileUrl: sUrl,
              sourceName: 'Discovery Engine',
              isUsable: true,
              customPitch: pitchGen.pitch,
              status: 'not_contacted',
              lastCheckedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            channelsForBiz.push(platform);
            channelPitches[platform] = pitchGen.pitch;
            totalChannelsFound++;
          }
        }

        // Leads without email but with alternative channels: register as Outreach needed (manual)
        if (!primaryContact?.email && channelsForBiz.length > 0) {
          manualOutreachOpportunities.push({
            businessName: newBiz.name,
            channels: channelsForBiz,
            score: scored.overallScore,
            businessId: bizId,
            pitches: channelPitches,
          });

          // Trigger instant alert for high-intent leads (score >= 80)
          if (scored.overallScore >= 80) {
            const highPriChannels = Object.entries(channelPitches).map(([p, pitch]) => ({
              platform: p,
              profileUrl: raw.socialUrls?.find(u => u.includes(p)) || '',
              pitch,
            }));
            runNotifierService
              .sendHighPriorityLeadAlert({
                businessName: newBiz.name,
                score: scored.overallScore,
                pipeline: scored.targetPipeline,
                channels: highPriChannels,
                businessId: bizId,
              })
              .catch((err) => console.warn('[ALERT] Failed to dispatch high-priority lead alert:', err));
          }
        }

        // 7. Draft Generation (Only in 'approval' or 'auto_send' modes; skipped in 'research' mode)
        if (operatingMode !== 'research' && newBiz.qualificationStatus === 'qualified') {
          const draftRes = await outreachService.generateDraft({
            business: newBiz,
            evidence: evList,
            websiteCheck: webCheckResult as any,
            contact: primaryContact,
            strategy: scored.targetPipeline === 'website_opportunities' ? 'web_development' : 'rag_systems',
            senderProfile: {
              name: 'Zia Ul Din',
              title: 'Full Stack AI Developer & Automation Architect',
              specialization: 'LLMs, Python, Data Science & Workflow Automation',
            },
          });

          const draftId = crypto.randomUUID();
          const isAutoSend = operatingMode === 'auto_send';

          const draftEntity: any = {
            id: draftId,
            businessId: bizId,
            contactId: primaryContact?.id || null,
            campaignId: 'camp-001-rag-expansion',
            strategy: scored.targetPipeline === 'website_opportunities' ? 'web_development' : 'rag_systems',
            ...draftRes.draft,
            version: 1,
            status: isAutoSend ? 'approved' : 'draft',
            approvedBy: isAutoSend ? 'auto_send_policy' : null,
            approvedAt: isAutoSend ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await dataStore.saveDraft(draftEntity);
          totalDrafts++;

          // 8. Controlled Auto-Send with 8-Point Automated Safeguard Engine
          if (isAutoSend && primaryContact?.email) {
            let dateOverride: Date | undefined;
            if (currentHourOverride !== undefined) {
              // Normalize to a weekday Tuesday at currentHourOverride UTC
              dateOverride = new Date('2026-10-27T12:00:00Z');
              dateOverride.setUTCHours(currentHourOverride, 0, 0, 0);
            }

            const guardResult = await autoSendGuard.evaluateAutoSendEligibility({
              business: newBiz,
              contact: primaryContact,
              draft: draftEntity,
              evidence: evList,
              websiteCheckedAt: (webCheckResult as any)?.checkedAt,
              currentDateOverride: dateOverride,
            });

            if (guardResult.eligibleForAutoSend) {
              const sendResult = await emailService.dispatchOutreachEmail({
                payload: {
                  to: primaryContact.email,
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
                await dataStore.updateDraftStatus(draftId, 'sent');
                totalSent++;

                if (channelsForBiz.length > 0) {
                  businessesEmailedWithOtherChannels.push({
                    businessName: newBiz.name,
                    email: primaryContact.email,
                    channels: channelsForBiz,
                    businessId: bizId,
                  });
                }
              }
            } else {
              // Blocked: save draft as 'blocked' with the exact primary block reason
              draftEntity.status = 'draft';
              draftEntity.deliveryStatus = 'blocked';
              draftEntity.rejectionReason = guardResult.primaryBlockReason;
              await dataStore.saveDraft(draftEntity);

              const reasonKey = guardResult.primaryBlockReason || 'Failed automated safety gates';
              skippedReasons[reasonKey] = (skippedReasons[reasonKey] || 0) + 1;
              blockedAutoSends.push({
                businessName: newBiz.name,
                email: primaryContact.email,
                reason: reasonKey,
              });
            }
          }
        }
      }

      // 9. Advance Checkpoint & Save to Postgres
      let nextOffset = (cursor.offset || 0) + 10;
      let nextMarketIndex = cursor.marketIndex || 0;
      let nextIndustryIndex = cursor.industryIndex || 0;

      if (nextOffset >= 30) {
        nextOffset = 0;
        nextMarketIndex = (nextMarketIndex + 1) % TARGET_MARKETS.length;
        nextIndustryIndex = (nextIndustryIndex + 1) % TARGET_INDUSTRIES.length;
      }

      const nextCheckpoint = {
        marketIndex: nextMarketIndex,
        industryIndex: nextIndustryIndex,
        offset: nextOffset,
        lastProcessedMarket: currentMarket,
        lastProcessedIndustry: currentIndustry,
        processedAt: new Date().toISOString(),
      };

      await dataStore.saveCheckpoint('discovery_pipeline', nextCheckpoint, totalDiscovered);

      const finishTime = new Date();
      const nextRun = runNotifierService.getNextRunDetails();

      const runHistory: SchedulerRunHistoryEntity = {
        runId,
        status: 'completed',
        startTimePkt: runNotifierService.formatToKarachiTime(new Date(startTime)),
        finishTimePkt: runNotifierService.formatToKarachiTime(finishTime),
        startTimeUtc: new Date(startTime).toISOString(),
        finishTimeUtc: finishTime.toISOString(),
        countriesSearched: [currentMarket, 'Worldwide'],
        sourcesSearched: ['Google Places', 'Companies House', 'B2B Registries'],
        leadsDiscovered: totalDiscovered,
        leadsQualified: totalQualified,
        draftsGenerated: totalDrafts,
        emailsSent: totalSent,
        skippedRecordsCount,
        skippedReasons,
        alternativeChannelsFound: totalChannelsFound,
        operatingMode,
        durationMs: Date.now() - startTime,
        nextScheduledRunPkt: nextRun.pkt,
        nextScheduledRunUtc: nextRun.utc,
        notificationStatus: 'sent',
      };

      // 10. Persist Run History to Supabase scheduler_run_history table
      await dataStore.recordSchedulerRun(runHistory);

      // 11. Send Execution Summary Email to Zia Ul Din (ziauldin371@gmail.com)
      await runNotifierService.sendRunSummaryReport({
        runId,
        status: 'completed',
        startTimeUtc: new Date(startTime),
        finishTimeUtc: finishTime,
        countriesSearched: [currentMarket, 'Worldwide'],
        sourcesSearched: ['Google Places', 'Companies House', 'B2B Registries'],
        leadsDiscovered: totalDiscovered,
        eligibleEmailContacts: totalQualified,
        emailsSubmittedToGmail: totalSent,
        skippedRecordsCount,
        skippedReasons,
        businessesEmailedWithOtherChannels,
        blockedAutoSends,
        manualOutreachOpportunities,
        operatingMode,
      });

      return {
        runId,
        status: 'completed',
        leadsDiscovered: totalDiscovered,
        leadsQualified: totalQualified,
        draftsGenerated: totalDrafts,
        emailsSent: totalSent,
        operatingMode,
        durationMs: Date.now() - startTime,
        checkpoint: nextCheckpoint,
      };
    } finally {
      // 12. Release Postgres Distributed Lock
      await dataStore.releaseLock(this.LOCK_NAME);
    }
  }
}

export const automationRunner = new AutomationRunner();
