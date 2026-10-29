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
