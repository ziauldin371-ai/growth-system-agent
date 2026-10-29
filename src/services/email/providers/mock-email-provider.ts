import { IEmailProvider, SendEmailPayload, SendEmailResponse } from '../types';
import crypto from 'crypto';

export class MockEmailProvider implements IEmailProvider {
  public readonly id = 'mock';
  public readonly name = 'Safe Mock Email Dispatcher';

  private sentLog: Array<SendEmailPayload & { sentAt: string; messageId: string }> = [];

  public isConfigured(): boolean {
    return true; // Always safe and available for test/development
  }

  public async send(payload: SendEmailPayload): Promise<SendEmailResponse> {
    // Block mock provider from claiming sends in live production
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_DISPATCH !== 'true') {
      return {
        success: false,
        provider: this.id,
        status: 'failed',
        error: 'Mock email provider is disabled in production. Real Gmail credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) are required.',
      };
    }

    const messageId = `mock_msg_${crypto.randomBytes(8).toString('hex')}`;
    
    this.sentLog.push({
      ...payload,
      sentAt: new Date().toISOString(),
      messageId,
    });

    return {
      success: true,
      provider: this.id,
      messageId,
      threadId: `${messageId}_th`,
      gmailUrl: `https://mail.google.com/mail/u/0/#sent/${messageId}`,
      status: 'mock_delivered',
    };
  }

  public getSentLog(): Array<SendEmailPayload & { sentAt: string; messageId: string }> {
    return [...this.sentLog];
  }

  public clearLog(): void {
    this.sentLog = [];
  }
}
