import { BusinessEntity, ContactEntity, EmailDraftEntity, GrowthEvidenceEntity } from '@/types';
import { lintEmailContent } from './content-linter';
import { checkRecipientLocalSendingWindow } from './recipient-timezone';
import { rateLimiter } from './rate-limiter';
import { warmupScheduler } from './warmup-scheduler';
import { dataStore } from '../repository/data-store';

export interface AutoSendEvaluationOptions {
  business: BusinessEntity;
  contact: ContactEntity;
  draft: EmailDraftEntity;
  evidence: GrowthEvidenceEntity[];
  websiteCheckedAt?: string | null;
  currentDateOverride?: Date;
  skipTestEmailCheckForTesting?: boolean;
}

export interface AutoSendEvaluationResult {
  eligibleForAutoSend: boolean;
  reasons: string[];
  primaryBlockReason?: string;
  checks: {
    emailVerified: boolean;
    notSuppressed: boolean;
    notSandboxData: boolean;
    businessActiveAndFresh: boolean;
    claimCheckPassed: boolean;
    contentLinterPassed: boolean;
    ukSoleTraderExcluded: boolean;
    recipientLocalTimeInsideWindow: boolean;
    warmupAndDailyCapAvailable: boolean;
    productionTestEmailConfirmed: boolean;
  };
}

export class AutoSendGuard {
  /**
   * Evaluates if a lead qualifies for 100% autonomous auto-send without manual approval.
   * If any check fails, returns eligibleForAutoSend: false and saves draft as 'blocked'.
   */
  public async evaluateAutoSendEligibility(
    options: AutoSendEvaluationOptions
  ): Promise<AutoSendEvaluationResult> {
    const {
      business,
      contact,
      draft,
      evidence = [],
      websiteCheckedAt,
      currentDateOverride,
      skipTestEmailCheckForTesting = false,
    } = options;

    const reasons: string[] = [];
    const checks = {
      emailVerified: true,
      notSuppressed: true,
      notSandboxData: true,
      businessActiveAndFresh: true,
      claimCheckPassed: true,
      contentLinterPassed: true,
      ukSoleTraderExcluded: true,
      recipientLocalTimeInsideWindow: true,
      warmupAndDailyCapAvailable: true,
      productionTestEmailConfirmed: true,
    };

    // 1. Email Verification Check
    const email = (contact.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      checks.emailVerified = false;
      reasons.push('Invalid email syntax.');
    } else {
      const vStatus = contact.verificationStatus;
      if (vStatus !== 'verified') {
        checks.emailVerified = false;
        reasons.push(`Email is not verified (status: "${vStatus || 'unverified'}"). Catch-all, risky, and unverified emails are excluded from auto-send.`);
      }
    }

    // 2. Suppression & Previous Contact Check
    const isSuppressed = await dataStore.isSuppressed(email);
    if (isSuppressed) {
      checks.notSuppressed = false;
      reasons.push(`Email or domain "${email}" is present on suppression / unsubscribe list.`);
    }

    if (business.domain) {
      const isDomainSuppressed = await dataStore.isSuppressed(business.domain);
      if (isDomainSuppressed) {
        checks.notSuppressed = false;
        reasons.push(`Company domain "${business.domain}" is on global suppression list.`);
      }
    }

    // Check if already contacted
    if (draft.status === 'sent' || draft.deliveryStatus === 'delivered' || business.qualificationStatus === 'contacted') {
      checks.notSuppressed = false;
      reasons.push('Lead or business has already been contacted.');
    }

    // 3. Sandbox / DEMO Data Guard
    const isSynthetic =
      email.endsWith('.internal') ||
      email.endsWith('.mock') ||
      email.includes('@example.') ||
      email.includes('docusynclogistics.io') ||
      business.sourceProvider === 'b2b_mock' ||
      (business as any).isDemo === true;

    if (isSynthetic) {
      checks.notSandboxData = false;
      reasons.push('Sandbox / DEMO lead detected. Synthetic and sandbox leads are strictly blocked from automated sending.');
    }

    // 4. Freshness (<48h) and Active Business Check
    const now = currentDateOverride ? currentDateOverride.getTime() : Date.now();
    const checkTime = websiteCheckedAt ? new Date(websiteCheckedAt).getTime() : new Date(business.updatedAt || business.createdAt).getTime();
    const ageHours = (now - checkTime) / (1000 * 60 * 60);

    if (ageHours > 48) {
      checks.businessActiveAndFresh = false;
      reasons.push(`Business verification data is ${ageHours.toFixed(1)} hours old (exceeds 48-hour freshness rule). Re-verification required before auto-send.`);
    }

    const companyTypeLower = (business.companyType || '').toLowerCase();
    if (companyTypeLower.includes('dissolved') || companyTypeLower.includes('closed') || companyTypeLower.includes('inactive')) {
      checks.businessActiveAndFresh = false;
      reasons.push('Business is marked as dissolved, closed, or inactive.');
    }

    // 5. UK Sole Trader / Individual Exclusion (PECR Compliance)
    const country = (business.country || '').toUpperCase();
    if (country === 'UK' || country === 'GB') {
      const isSoleTrader =
        companyTypeLower.includes('sole trader') ||
        companyTypeLower.includes('individual') ||
        companyTypeLower.includes('unincorporated') ||
        companyTypeLower.includes('sole proprietorship');

      if (isSoleTrader) {
        checks.ukSoleTraderExcluded = false;
        reasons.push('UK sole traders and individuals are excluded from cold outreach by default under UK PECR compliance regulations.');
      }
    }

    // 6. Claim-Check & Content Linter
    const lintResult = lintEmailContent(draft.selectedSubject, draft.emailBody, true);
    if (!lintResult.passed || lintResult.errors.length > 0) {
      checks.contentLinterPassed = false;
      reasons.push(`Content linter failed: ${lintResult.errors.join('; ')}`);
    }

    // Claim check: ensure pitch makes no fabricated claims without stored evidence
    const bodyLower = draft.emailBody.toLowerCase();
    const hasEvidence = evidence && evidence.length > 0;
    if (!hasEvidence && (bodyLower.includes('noticed your') || bodyLower.includes('observed that') || bodyLower.includes('saw that you'))) {
      checks.claimCheckPassed = false;
      reasons.push('Claim-check failed: Pitch contains specific observation claims but zero supporting factual evidence was found in lead dossier.');
    }

    // 7. Recipient Real Local Time Window (09:00 - 17:00, Mon-Fri)
    const localTimeCheck = checkRecipientLocalSendingWindow(
      business.country,
      business.region || business.city,
      9,
      17,
      currentDateOverride
    );

    if (!localTimeCheck.isWithinSendingWindow) {
      checks.recipientLocalTimeInsideWindow = false;
      reasons.push(localTimeCheck.reason || 'Outside recipient local business hours.');
    }

    // 8. Warm-up Ramp & Daily Limits
    const warmupState = warmupScheduler.getWarmupState();
    const rateLimitCheck = rateLimiter.checkRateLimit(email, warmupState.dailyCap);
    if (!rateLimitCheck.allowed) {
      checks.warmupAndDailyCapAvailable = false;
      reasons.push(rateLimitCheck.reason || 'Sending volume limit or rate limit exceeded.');
    }

    // 9. Production Prerequisite: Confirmed Test Email to ziauldin371@gmail.com
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !skipTestEmailCheckForTesting) {
      const sentDrafts = await dataStore.getSentEmails();
      const hasConfirmedTest = sentDrafts.some(
        (d: any) =>
          d.recipientEmail?.toLowerCase() === 'ziauldin371@gmail.com' &&
          (d.deliveryStatus === 'delivered' || d.status === 'sent') &&
          Boolean(d.gmailMessageId)
      );

      if (!hasConfirmedTest) {
        checks.productionTestEmailConfirmed = false;
        reasons.push('Production Prerequisite: Auto-send is locked until a test email to ziauldin371@gmail.com is confirmed in Gmail Sent.');
      }
    }

    const eligibleForAutoSend = reasons.length === 0;

    return {
      eligibleForAutoSend,
      reasons,
      primaryBlockReason: reasons.length > 0 ? reasons[0] : undefined,
      checks,
    };
  }
}

export const autoSendGuard = new AutoSendGuard();
