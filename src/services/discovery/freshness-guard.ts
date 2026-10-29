import { BusinessEntity, WebsiteCheckEntity, ContactEntity } from '@/types';
import { verifyWebsite } from '../website/verifier';

export interface FreshnessVerificationResult {
  isEligibleForEmail: boolean;
  rejectionReason?: string;
  reVerified: boolean;
  heatScore: number;
  triggerFreshnessRank: number;
  updatedWebsiteCheck?: WebsiteCheckEntity;
}

const MAX_FRESHNESS_HOURS = 48;

/**
 * Evaluates whether a lead meets the strict 48-hour freshness verification rule
 * before any email draft can be dispatched or queued for sending.
 */
export async function enforceLeadFreshness(params: {
  business: BusinessEntity;
  websiteCheck?: WebsiteCheckEntity | null;
  contacts?: ContactEntity[];
  hasRecentReviews?: boolean;
  isNewRegistration?: boolean;
}): Promise<FreshnessVerificationResult> {
  const { business, websiteCheck, contacts, hasRecentReviews, isNewRegistration } = params;

  // 1. Immediately reject permanently closed businesses
  if (business.isPermanentlyClosed) {
    return {
      isEligibleForEmail: false,
      rejectionReason: 'Business is marked as permanently or temporarily closed.',
      reVerified: false,
      heatScore: 0,
      triggerFreshnessRank: 0,
    };
  }

  const now = Date.now();
  let lastCheckedTime = 0;

  if (business.lastVerifiedAt) {
    lastCheckedTime = new Date(business.lastVerifiedAt).getTime();
  } else if (websiteCheck?.checkedAt) {
    lastCheckedTime = new Date(websiteCheck.checkedAt).getTime();
  }

  const hoursSinceCheck = lastCheckedTime > 0 ? (now - lastCheckedTime) / (1000 * 60 * 60) : 999;
  let reVerified = false;
  let currentWebsiteCheck = websiteCheck;

  // 2. If verification is older than 48 hours (or missing), run re-verification
  if (hoursSinceCheck > MAX_FRESHNESS_HOURS) {
    const freshWebCheck = await verifyWebsite({
      domain: business.domain || undefined,
      socialUrls: [],
      businessName: business.name,
    });

    currentWebsiteCheck = {
      id: `wc_${business.id}_recheck`,
      businessId: business.id,
      domain: business.domain || null,
      status: freshWebCheck.status,
      httpStatusCode: freshWebCheck.httpStatusCode,
      tlsValid: freshWebCheck.tlsValid,
      ipAddress: freshWebCheck.ipAddress,
      isPrivateIp: freshWebCheck.isPrivateIp,
      redirectChain: freshWebCheck.redirectChain,
      pageTitle: freshWebCheck.pageTitle,
      verificationLatencyMs: freshWebCheck.verificationLatencyMs,
      checkedAt: new Date().toISOString(),
      errorDetails: freshWebCheck.errorDetails,
    };
    reVerified = true;
  }

  // 3. Evaluate contact email status
  const primaryContact = contacts?.find(c => c.isPrimary) || contacts?.[0];
  const hasValidEmail = Boolean(
    primaryContact?.email &&
    primaryContact.email.includes('@') &&
    primaryContact.verificationStatus !== 'invalid' &&
    primaryContact.verificationStatus !== 'disposable'
  );

  // 4. Calculate Freshness & Heat Score
  let freshnessRank = 50; // base score
  if (isNewRegistration) freshnessRank += 30; // High priority: newly incorporated
  if (hasRecentReviews) freshnessRank += 15; // Active commercial traffic
  if (hoursSinceCheck <= 24) freshnessRank += 10;

  let reachabilityScore = 0;
  if (hasValidEmail) reachabilityScore += 50;
  if (business.phone) reachabilityScore += 25;
  if (business.alternativeChannels && business.alternativeChannels.length > 0) reachabilityScore += 25;

  const heatScore = Math.min(100, Math.round((freshnessRank * 0.5) + (reachabilityScore * 0.5)));

  // If website is broken or dead during re-check for AI/software pipeline, verify eligibility
  if (currentWebsiteCheck && currentWebsiteCheck.status === 'broken' && business.pipelineType === 'ai_software_opportunities') {
    return {
      isEligibleForEmail: false,
      rejectionReason: 'Website is broken or dead; requires website opportunities pipeline reclassification.',
      reVerified,
      heatScore,
      triggerFreshnessRank: freshnessRank,
      updatedWebsiteCheck: currentWebsiteCheck || undefined,
    };
  }

  return {
    isEligibleForEmail: hasValidEmail,
    rejectionReason: hasValidEmail ? undefined : 'No verified, deliverable email contact found.',
    reVerified,
    heatScore,
    triggerFreshnessRank: freshnessRank,
    updatedWebsiteCheck: currentWebsiteCheck || undefined,
  };
}
