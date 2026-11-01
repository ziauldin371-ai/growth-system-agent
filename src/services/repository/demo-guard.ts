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
    record.source_provider === 'service_role_test' ||
    record.source_provider === 'service_role'
  ) return true;

  if (typeof record.name === 'string') {
    const n = record.name.toLowerCase();
    if (n.startsWith('test business') || n.includes('mock') || n.includes('demo')) return true;
  }

  if (typeof record.domain === 'string') {
    const d = record.domain.toLowerCase();
    if (d.includes('.mock') || d.includes('.internal') || d.includes('docusynclogistics.io')) return true;
  }

  if (typeof record.recipientEmail === 'string') {
    const e = record.recipientEmail.toLowerCase();
    if (e.includes('.mock') || e.includes('.internal') || e.includes('docusynclogistics.io') || e.includes('competitor.com')) return true;
  }

  if (typeof record.id === 'string') {
    const id = record.id.toLowerCase();
    if (id.startsWith('biz-00') || id.startsWith('draft-00') || id.startsWith('seed-') || id.includes('demo') || id.startsWith('ch-00')) {
      return true;
    }
  }

  if (record.organizationId === 'org-demo-001') return true;

  return false;
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
 * 2. Manual outreach is a strict subset of businesses found.
 * 3. No card can exceed totalBusinesses.
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

  // Filter businesses: if !showDemo, exclude all sandbox/demo records
  const businesses = rawBusinesses.filter(b => (showDemo ? true : !isDemoOrSandboxRecord(b)));
  const totalBusinesses = businesses.length;

  // Qualified is a strict subset of filtered businesses
  const qualifiedTotal = businesses.filter(b => b.qualificationStatus === 'qualified').length;

  // Eligible ready-for-email contacts is a strict subset of filtered businesses
  const eligibleEmailContacts = businesses.filter(b => {
    if (b.qualificationStatus !== 'qualified') return false;
    const hasWebsite = b.domain && b.domain.length > 0;
    const webStatus = b.websiteCheck?.status;
    return Boolean(hasWebsite && webStatus !== 'broken' && webStatus !== 'parked');
  }).length;

  // Manual outreach is businesses with no email or social-only (strict subset of filtered businesses)
  const manualOutreachCount = businesses.filter(b => {
    const hasDomain = Boolean(b.domain && b.domain.length > 0);
    const webStatus = b.websiteCheck?.status;
    const isNoWeb = !hasDomain || webStatus === 'apparently_absent' || webStatus === 'social_only';
    return isNoWeb;
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
  const hasAnyActivity = totalBusinesses > 0 || sentCount > 0 || manualOutreachCount > 0 || blockedDraftsCount > 0;

  if (!hasAnyActivity) {
    timelineSentences = ['Nothing yet. Start by connecting your services.'];
  } else {
    timelineSentences = [
      `Discovered ${totalBusinesses} businesses across target global markets.`,
      `${manualOutreachCount} businesses have no website or only social media.`,
      `Verified ${eligibleEmailContacts} businesses matching 8-point strict safety rules.`,
      `Sent ${sentCount} emails confirmed in Gmail with verified message IDs.`,
      `${manualOutreachCount} businesses waiting for manual phone or social media outreach.`,
    ];
  }

  return {
    totalBusinesses,
    qualifiedTotal: Math.min(qualifiedTotal, totalBusinesses),
    eligibleEmailContacts: Math.min(eligibleEmailContacts, totalBusinesses),
    sentCount: Math.min(sentCount, totalBusinesses || sentCount),
    confirmedDeliveries: Math.min(confirmedDeliveries, totalBusinesses || confirmedDeliveries),
    repliesCount: Math.min(repliesCount, totalBusinesses || repliesCount),
    manualOutreachCount: Math.min(manualOutreachCount, totalBusinesses),
    blockedDraftsCount,
    timelineSentences,
    isGmailConnected,
    showDemo,
  };
}

