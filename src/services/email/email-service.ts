import { IEmailProvider, SendEmailPayload, SendEmailResponse } from './types';
import { MockEmailProvider } from './providers/mock-email-provider';
import { ResendProvider } from './providers/resend-provider';
import { GmailProvider } from './providers/gmail-provider';
import { complianceGuard } from './compliance-guard';
import { rateLimiter } from './rate-limiter';

export interface DispatchEmailOptions {
  payload: SendEmailPayload;
  isExplicitlyApproved: boolean;
  suppressedEmails?: Set<string>;
  suppressedDomains?: Set<string>;
  sendingWindowStart?: number;
  sendingWindowEnd?: number;
  currentHour?: number;
  customDailyCap?: number;
}

export class EmailService {
  private providers: Map<string, IEmailProvider> = new Map();
  private processedIdempotencyKeys: Set<string> = new Set();
  public mockProvider: MockEmailProvider;
  public gmailProvider: GmailProvider;

  constructor() {
    this.mockProvider = new MockEmailProvider();
    this.gmailProvider = new GmailProvider();
    this.registerProvider(this.mockProvider);
    this.registerProvider(this.gmailProvider);
    this.registerProvider(new ResendProvider());
  }

  public registerProvider(provider: IEmailProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProviders(): Array<{ id: string; name: string; isConfigured: boolean }> {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      isConfigured: p.isConfigured(),
    }));
  }

  public async dispatchOutreachEmail(options: DispatchEmailOptions): Promise<SendEmailResponse> {
    const { payload, isExplicitlyApproved, suppressedEmails, suppressedDomains, sendingWindowStart, sendingWindowEnd, currentHour } = options;

    // 1. Idempotency Check (Prevent duplicate dispatch on retry/restart)
    if (this.processedIdempotencyKeys.has(payload.idempotencyKey)) {
      return {
        success: true,
        provider: 'idempotency_cache',
        status: 'sent',
        messageId: `cached_${payload.idempotencyKey}`,
        error: 'Duplicate send intercepted by idempotency filter.',
      };
    }

    // 2. Select Email Provider (Gmail API > Resend > Mock)
    let preferredId = process.env.EMAIL_PROVIDER;
    if (!preferredId) {
      if (this.providers.get('gmail')?.isConfigured()) {
        preferredId = 'gmail';
      } else if (this.providers.get('resend')?.isConfigured()) {
        preferredId = 'resend';
      } else {
        preferredId = 'mock';
      }
    }

    let provider = this.providers.get(preferredId);
    if (!provider || !provider.isConfigured()) {
      provider = this.mockProvider;
    }

    const isRealGmailActive = provider.id === 'gmail';

    // 3. Compliance and Approval Verification (Sandbox Guard, Window, Opt-outs)
    const complianceCheck = complianceGuard.verifySendEligibility({
      recipientEmail: payload.to,
      isExplicitlyApproved,
      isSandboxData: payload.metadata?.isSandboxData ?? (options as any)?.isSandboxData,
      sourceProvider: payload.metadata?.sourceProvider ?? (options as any)?.sourceProvider,
      isRealGmailActive,
      suppressedEmails,
      suppressedDomains,
      sendingWindowStart,
      sendingWindowEnd,
      currentHour,
    });

    if (!complianceCheck.allowed) {
      return {
        success: false,
        provider: 'compliance_guard',
        status: 'rejected_compliance',
        error: `[${complianceCheck.code}] ${complianceCheck.reason}`,
      };
    }

    // 4. Rate Limit Verification (Domain velocity & daily cap)
    const rateCheck = rateLimiter.checkRateLimit(payload.to, options.customDailyCap);
    if (!rateCheck.allowed) {
      return {
        success: false,
        provider: 'rate_limiter',
        status: 'rejected_compliance',
        error: `[RATE_LIMIT_EXCEEDED] ${rateCheck.reason}`,
      };
    }

    // 5. Append Statutory Compliance Footer
    const finalBody = complianceGuard.appendComplianceFooter(payload.body, payload.to);
    const defaultSenderEmail = process.env.OUTREACH_SENDER_EMAIL || 'ziauldin371@gmail.com';
    const defaultSenderName = process.env.OUTREACH_SENDER_NAME || 'Zia Ul Din | AI & Automation Solutions';

    const finalPayload: SendEmailPayload = {
      ...payload,
      fromEmail: payload.fromEmail || defaultSenderEmail,
      fromName: payload.fromName || defaultSenderName,
      body: finalBody,
    };

    // 6. Execute Send
    const result = await provider.send(finalPayload);

    if (result.success) {
      this.processedIdempotencyKeys.add(payload.idempotencyKey);
      rateLimiter.recordSend(payload.to);
    }

    return result;
  }
}

export const emailService = new EmailService();
