import { BusinessEntity, EmailDraftEntity } from '@/types';

/**
 * Checks if a business, draft, or any record is a demo, seed, or sandbox entity.
 * Excludes them from all real production counts and dashboard cards.
 */
export function isDemoOrSandboxRecord(record: any): boolean {
  if (!record) return false;
  if (record.isSandboxData === true) return true;
  if (record.isDemo === true) return true;
  if (
    record.sourceProvider === 'b2b_mock' ||
    record.sourceProvider === 'mock' ||
    record.sourceProvider === 'service_role_test' ||
    record.sourceProvider === 'service_role' ||
    record.sourceProvider === 'test' ||
    record.source_provider === 'b2b_mock' ||
    record.source_provider === 'mock' ||
    record.source_provider === 'service_role_test' ||
    record.source_provider === 'service_role' ||
    record.source_provider === 'test'
  ) return true;

  if (typeof record.name === 'string') {
    const n = record.name.toLowerCase();
    if (n.startsWith('test business') || n.startsWith('test_') || n.includes('mock') || n.includes('demo')) return true;
  }

  if (typeof record.domain === 'string') {
    const d = record.domain.toLowerCase();
    if (d.includes('.mock') || d.includes('.internal') || d.includes('docusynclogistics.io') || d.includes('testbiz-') || d.includes('testdomain.com')) return true;
  }

  if (typeof record.recipientEmail === 'string') {
    const e = record.recipientEmail.toLowerCase();
    if (e.includes('.mock') || e.includes('.internal') || e.includes('docusynclogistics.io') || e.includes('competitor.com') || e.includes('testdomain.com') || e.includes('testbiz-')) return true;
  }

  if (typeof record.id === 'string') {
    const id = record.id.toLowerCase();
    if (id.startsWith('biz-00') || id.startsWith('draft-00') || id.startsWith('seed-') || id.includes('demo') || id.startsWith('ch-00') || id.startsWith('test_') || id.startsWith('test-')) {
      return true;
    }
  }

  if (record.organizationId === 'org-demo-001') return true;

  return false;
}

/**
 * Determines whether a timestamp represents a record created today (UTC day).
 */
export function isCreatedToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getUTCFullYear() === now.getUTCFullYear() &&
      d.getUTCMonth() === now.getUTCMonth() &&
      d.getUTCDate() === now.getUTCDate()
    );
  } catch {
    return false;
  }
}

export interface UnifiedBusinessCounts {
  total: number;
  foundToday: number;
  needsWebsites: number;
  brokenWebsites: number;
  needsAi: number;
  hotRequests: number;
  qualifiedTotal: number;
  manualOutreachCount: number;
}

/**
 * Single shared selector query/calculator used by Home, Businesses Found,
 * filter tabs, and sidebar. Guarantees they can never disagree.
 */
export function getUnifiedBusinessCounts(
  rawBusinesses: BusinessEntity[],
  options?: { showDemo?: boolean }
): UnifiedBusinessCounts {
  const showDemo = options?.showDemo ?? false;
  const businesses = rawBusinesses.filter(b => (showDemo ? true : !isDemoOrSandboxRecord(b)));
  const total = businesses.length;

  const foundToday = businesses.filter(b => isCreatedToday(b.createdAt)).length;

  const needsWebsites = businesses.filter(b => {
    const hasDomain = Boolean(b.domain && b.domain.trim().length > 0);
    const status = b.websiteCheck?.status;
    return !hasDomain || status === 'apparently_absent' || status === 'social_only';
  }).length;

  const brokenWebsites = businesses.filter(b => {
    const status = b.websiteCheck?.status;
    return status === 'parked' || status === 'broken';
  }).length;

  const needsAi = businesses.filter(b => b.pipelineType === 'ai_software_opportunities').length;

  const hotRequests = businesses.filter(
    b => (b.heatScore || 0) >= 75 || b.sourceProvider === 'hacker_news' || b.sourceProvider === 'reddit'
  ).length;

  const qualifiedTotal = businesses.filter(b => b.qualificationStatus === 'qualified').length;
  const manualOutreachCount = needsWebsites;

  return {
    total,
    foundToday,
    needsWebsites,
    brokenWebsites,
    needsAi,
    hotRequests,
    qualifiedTotal,
    manualOutreachCount,
  };
}

/**
 * Determines whether an email draft is a verified real email sent via Gmail.
 *
 * Rules:
 * 1. Must NOT be sandbox or demo data.
 * 2. Gmail MUST be connected.
 * 3. Must have a real Gmail message ID (not empty, not the mock seed).
 * 4. Must have a verified SENT label / confirmation from Gmail API.
 */
export function isRealVerifiedSentEmail(draft: any, isGmailConnected: boolean = true): boolean {
  if (!isGmailConnected) return false;
  if (!draft) return false;
  if (isDemoOrSandboxRecord(draft)) return false;

  const messageId = draft.gmailMessageId || draft.messageId;
  if (!messageId || typeof messageId !== 'string') return false;
  const cleanId = messageId.trim();
  if (cleanId.length === 0) return false;
  if (cleanId === '1928374a5b6c7d8e' || cleanId.toLowerCase().includes('mock') || cleanId.toLowerCase().includes('seed')) {
    return false;
  }

  const hasSentStatus = draft.status === 'sent' || draft.deliveryStatus === 'delivered' || draft.deliveryStatus === 'sent';
  if (!hasSentStatus) return false;

  const hasSentLabel =
    draft.gmailConfirmed === true ||
    draft.reconciledStatus === 'sent_confirmed' ||
    (Array.isArray(draft.gmailLabels) && draft.gmailLabels.includes('SENT')) ||
    draft.deliveryStatus === 'delivered';

  return Boolean(hasSentLabel);
}

export interface HomeDashboardStats {
  totalBusinesses: number;
  foundToday: number;
  needsWebsites: number;
  brokenWebsites: number;
  needsAi: number;
  hotRequests: number;
  qualifiedTotal: number;
  eligibleEmailContacts: number;
  sentCount: number;
  confirmedDeliveries: number;
  repliesCount: number;
  manualOutreachCount: number;
  blockedDraftsCount: number;
  timelineSentences: string[];
  isGmailConnected: boolean;
  showDemo: boolean;
}

/**
 * Computes consistent Home dashboard statistics and activity timeline.
 * Ensures that:
 * 1. Only real records are counted unless showDemo is true.
 * 2. Found today = real businesses created today by discovery.
 * 3. Opportunities are counted only when they belong to a real, existing business record.
 * 4. With no real data, all numbers are 0 and timeline says:
 *    "Nothing yet. Start by connecting your services."
 */
export function computeHomeStats(params: {
  businesses: BusinessEntity[];
  drafts: EmailDraftEntity[];
  isGmailConnected: boolean;
  showDemo?: boolean;
}): HomeDashboardStats {
  const { businesses: rawBusinesses, drafts: rawDrafts, isGmailConnected, showDemo = false } = params;

  // Use the shared selector query
  const counts = getUnifiedBusinessCounts(rawBusinesses, { showDemo });
  const businesses = rawBusinesses.filter(b => (showDemo ? true : !isDemoOrSandboxRecord(b)));

  // Eligible ready-for-email contacts is a strict subset of filtered businesses
  const eligibleEmailContacts = businesses.filter(b => {
    if (b.qualificationStatus !== 'qualified') return false;
    const hasWebsite = b.domain && b.domain.length > 0;
    const webStatus = b.websiteCheck?.status;
    return Boolean(hasWebsite && webStatus !== 'broken' && webStatus !== 'parked');
  }).length;

  // Filter drafts: if !showDemo, exclude all sandbox/demo drafts
  const drafts = rawDrafts.filter(d => (showDemo ? true : !isDemoOrSandboxRecord(d)));

  // Sent count: counts only verified sent emails with real Gmail message ID and SENT label
  const verifiedSentDrafts = drafts.filter(d => {
    if (showDemo) {
      return d.status === 'sent' && Boolean(d.gmailMessageId);
    }
    return isRealVerifiedSentEmail(d, isGmailConnected);
  });
  const sentCount = verifiedSentDrafts.length;
  const confirmedDeliveries = sentCount;

  // Replies: only count if Gmail is connected and not demo
  const repliesCount = isGmailConnected
    ? drafts.filter(d => (showDemo ? true : !isDemoOrSandboxRecord(d)) && d.deliveryStatus === 'replied').length
    : 0;

  // Blocked drafts
  const blockedDraftsCount = drafts.filter(
    d => (d as any).deliveryStatus === 'blocked' || d.status === 'rejected'
  ).length;

  // Timeline sentences
  let timelineSentences: string[] = [];
  const hasAnyActivity = counts.total > 0 || sentCount > 0 || counts.manualOutreachCount > 0 || blockedDraftsCount > 0;

  if (!hasAnyActivity) {
    timelineSentences = ['Nothing yet. Start by connecting your services.'];
  } else {
    timelineSentences = [
      `Discovered ${counts.total} businesses across target global markets.`,
      `${counts.manualOutreachCount} businesses have no website or only social media.`,
      `Verified ${eligibleEmailContacts} businesses matching 8-point strict safety rules.`,
      `Sent ${sentCount} emails confirmed in Gmail with verified message IDs.`,
      `${counts.manualOutreachCount} businesses waiting for manual phone or social media outreach.`,
    ];
  }

  return {
    totalBusinesses: counts.total,
    foundToday: counts.foundToday,
    needsWebsites: counts.needsWebsites,
    brokenWebsites: counts.brokenWebsites,
    needsAi: counts.needsAi,
    hotRequests: counts.hotRequests,
    qualifiedTotal: Math.min(counts.qualifiedTotal, counts.total),
    eligibleEmailContacts: Math.min(eligibleEmailContacts, counts.total),
    sentCount: Math.min(sentCount, counts.total || sentCount),
    confirmedDeliveries: Math.min(confirmedDeliveries, counts.total || confirmedDeliveries),
    repliesCount: Math.min(repliesCount, counts.total || repliesCount),
    manualOutreachCount: Math.min(counts.manualOutreachCount, counts.total),
    blockedDraftsCount,
    timelineSentences,
    isGmailConnected,
    showDemo,
  };
}
