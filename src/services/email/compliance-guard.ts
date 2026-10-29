import { normalizeEmail } from '../crm/normalization';

export const ALLOWED_REAL_SOURCES = new Set([
  'google_places',
  'companies_house',
  'reddit',
  'hacker_news',
  'remotive',
  'us_registry',
  'manual_verified',
  'verified_b2b_discovery',
]);

export interface ComplianceCheckOptions {
  recipientEmail: string;
  isExplicitlyApproved: boolean;
  isSandboxData?: boolean;
  isRealGmailActive?: boolean;
  sourceProvider?: string;
  sendingWindowStart?: number; // 0-23
  sendingWindowEnd?: number;   // 0-23
  currentHour?: number;        // 0-23 (for test injection)
  suppressedEmails?: Set<string>;
  suppressedDomains?: Set<string>;
  physicalMailingAddress?: string;
  unsubscribeUrl?: string;
}

export interface ComplianceCheckResult {
  allowed: boolean;
  reason?: string;
  code?: 'EMERGENCY_STOP' | 'NOT_APPROVED' | 'SUPPRESSED' | 'OUTSIDE_SENDING_WINDOW' | 'INVALID_RECIPIENT' | 'COMPLIANCE_RESTRICTION';
}

export class ComplianceGuard {
  /**
   * Evaluates all statutory compliance and administrative guardrails before email dispatch.
   */
  public verifySendEligibility(options: ComplianceCheckOptions): ComplianceCheckResult {
    const {
      recipientEmail,
      isExplicitlyApproved,
      sendingWindowStart = 9,
      sendingWindowEnd = 17,
      currentHour = new Date().getHours(),
      suppressedEmails = new Set(),
      suppressedDomains = new Set(),
      isRealGmailActive = false,
      sourceProvider,
    } = options;

    // 1. Emergency Stop Kill-Switch
    if (process.env.EMERGENCY_STOP === 'true') {
      return {
        allowed: false,
        code: 'EMERGENCY_STOP',
        reason: 'Emergency Stop is currently active across all campaign dispatchers.',
      };
    }

    // 2. Explicit Administrator Approval Gate
    if (!isExplicitlyApproved) {
      return {
        allowed: false,
        code: 'NOT_APPROVED',
        reason: 'Outreach email has not received explicit authenticated administrator approval. GrowthSignal AI operates in strict draft-only mode by default.',
      };
    }

    // 2b. Strict Sandbox Guard & Live Source Verification
    const isSyntheticDomain = 
      recipientEmail.endsWith('.internal') ||
      recipientEmail.endsWith('.mock') ||
      recipientEmail.includes('@example.') ||
      recipientEmail.includes('@targetcorp.com') ||
      recipientEmail.includes('@testdental.') ||
      recipientEmail.includes('vanguardhvac.mock') ||
      recipientEmail.includes('docusynclogistics.io') || // demo seed domain
      options.isSandboxData === true;

    // Strict Rule: When real Gmail provider is active, block ALL demo/sandbox data regardless of NODE_ENV
    if (isRealGmailActive) {
      if (options.isSandboxData === true) {
        return {
          allowed: false,
          code: 'COMPLIANCE_RESTRICTION',
          reason: `Sandbox Guard: Demo/sandbox lead "${recipientEmail}" cannot be emailed via the live Gmail provider (blocked in all environments).`,
        };
      }

      if (isSyntheticDomain) {
        return {
          allowed: false,
          code: 'COMPLIANCE_RESTRICTION',
          reason: `Sandbox Guard: Synthetic/mock domain recipient "${recipientEmail}" cannot receive live emails via Gmail API.`,
        };
      }

      if (sourceProvider && !ALLOWED_REAL_SOURCES.has(sourceProvider)) {
        return {
          allowed: false,
          code: 'COMPLIANCE_RESTRICTION',
          reason: `Sandbox Guard: Source provider "${sourceProvider}" is not in the verified live source allowlist. Live sending blocked.`,
        };
      }
    }

    // Secondary safety: Production sandbox block
    if (isSyntheticDomain && process.env.NODE_ENV === 'production' && process.env.ALLOW_SANDBOX_SEND !== 'true') {
      return {
        allowed: false,
        code: 'COMPLIANCE_RESTRICTION',
        reason: `Sandbox/Demo recipient "${recipientEmail}" cannot receive outgoing dispatches in production.`,
      };
    }

    // 3. Email Format & Normalization
    const normalized = normalizeEmail(recipientEmail);
    if (!normalized || !normalized.includes('@')) {
      return {
        allowed: false,
        code: 'INVALID_RECIPIENT',
        reason: `Recipient email "${recipientEmail}" is malformed or invalid.`,
      };
    }

    const domain = normalized.split('@')[1];

    // 4. Suppression List Checks (Unsubscribes, Hard Bounces, DNC)
    if (suppressedEmails.has(normalized)) {
      return {
        allowed: false,
        code: 'SUPPRESSED',
        reason: `Recipient "${normalized}" is on the suppression list (prior unsubscribe, bounce, or DNC request).`,
      };
    }

    if (suppressedDomains.has(domain)) {
      return {
        allowed: false,
        code: 'SUPPRESSED',
        reason: `Domain "${domain}" is registered on the organizational suppression list.`,
      };
    }

    // 5. Sending Window Verification (Default 09:00 - 17:00 local business hours)
    if (currentHour < sendingWindowStart || currentHour >= sendingWindowEnd) {
      return {
        allowed: false,
        code: 'OUTSIDE_SENDING_WINDOW',
        reason: `Current time (${currentHour}:00) is outside the permitted sending window (${sendingWindowStart}:00 - ${sendingWindowEnd}:00). Send queued for next business window.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Appends statutory compliance disclosure, physical postal address, and opt-out link.
   * Required under CAN-SPAM Act (15 U.S.C. 7704) and UK PECR / GDPR.
   */
  public appendComplianceFooter(
    rawBody: string,
    recipientEmail: string,
    options?: {
      physicalAddress?: string;
      unsubscribeBaseUrl?: string;
    }
  ): string {
    const address = options?.physicalAddress || 
      process.env.PHYSICAL_MAILING_ADDRESS || 
      'GrowthSignal AI Operations, 123 Innovation Way, Suite 400, San Francisco, CA 94105';
    
    const unsubBase = options?.unsubscribeBaseUrl || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/compliance/unsubscribe`;
    
    const unsubscribeLink = `${unsubBase}?email=${encodeURIComponent(recipientEmail)}`;

    const footer = `
---
You are receiving this commercial message because public records indicate technical or business activity relevant to our services.
If you prefer not to receive future communications, click here to opt out immediately:
${unsubscribeLink}

Physical Office:
${address}
`.trim();

    return `${rawBody.trim()}\n\n${footer}`;
  }
}

export const complianceGuard = new ComplianceGuard();
