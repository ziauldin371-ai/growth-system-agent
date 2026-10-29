import { IEmailProvider, SendEmailPayload, SendEmailResponse } from '../types';

/**
 * Resend Email Provider Adapter
 * Sends transactional and outreach emails using Resend REST API.
 * Requires RESEND_API_KEY in environment.
 */
export class ResendProvider implements IEmailProvider {
  public readonly id = 'resend';
  public readonly name = 'Resend Delivery Platform';

  public isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
  }

  public async send(payload: SendEmailPayload): Promise<SendEmailResponse> {
    if (!this.isConfigured()) {
      throw new Error('Resend is unconfigured: RESEND_API_KEY environment variable is missing.');
    }

    const apiKey = process.env.RESEND_API_KEY!;
    const fromAddress = payload.fromEmail || process.env.EMAIL_FROM_ADDRESS || 'outreach@growthsignal.ai';
    const fromName = payload.fromName || process.env.EMAIL_FROM_NAME || 'GrowthSignal AI';

    const resendPayload = {
      from: `${fromName} <${fromAddress}>`,
      to: [payload.to],
      subject: payload.subject,
      text: payload.body,
      headers: {
        'X-Idempotency-Key': payload.idempotencyKey,
      },
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        provider: this.id,
        status: 'failed',
        error: `Resend API returned ${response.status}: ${errText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      provider: this.id,
      messageId: data.id,
      status: 'sent',
    };
  }
}
