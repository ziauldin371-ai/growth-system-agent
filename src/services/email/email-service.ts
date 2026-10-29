import { IEmailProvider, SendEmailPayload, SendEmailResponse } from './types';
import { MockEmailProvider } from './providers/mock-email-provider';
import { ResendProvider } from './providers/resend-provider';
import { complianceGuard } from './compliance-guard';

export interface DispatchEmailOptions {
  payload: SendEmailPayload;
  isExplicitlyApproved: boolean;
  suppressedEmails?: Set<string>;
  suppressedDomains?: Set<string>;
  sendingWindowStart?: number;
  sendingWindowEnd?: number;
  currentHour?: number;
}

export class EmailService {
  private providers: Map<string, IEmailProvider> = new Map();
  private processedIdempotencyKeys: Set<string> = new Set();
  public mockProvider: MockEmailProvider;

  constructor() {
    this.mockProvider = new MockEmailProvider();
    this.registerProvider(this.mockProvider);
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

    // 2. Compliance and Approval Verification
    const complianceCheck = complianceGuard.verifySendEligibility({
      recipientEmail: payload.to,
      isExplicitlyApproved,
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

    // 3. Append Statutory Compliance Footer
    const finalBody = complianceGuard.appendComplianceFooter(payload.body, payload.to);
    const finalPayload: SendEmailPayload = {
      ...payload,
      body: finalBody,
    };

    // 4. Select Email Provider (Default to mock unless RESEND_API_KEY is configured and EMAIL_PROVIDER=resend)
    const preferredId = process.env.EMAIL_PROVIDER || 'mock';
    let provider = this.providers.get(preferredId);
    if (!provider || !provider.isConfigured()) {
      provider = this.mockProvider;
    }

    // 5. Execute Send
    const result = await provider.send(finalPayload);

    if (result.success) {
      this.processedIdempotencyKeys.add(payload.idempotencyKey);
    }

    return result;
  }
}

export const emailService = new EmailService();
