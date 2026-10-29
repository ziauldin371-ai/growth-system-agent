export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
  campaignId?: string;
  leadId?: string;
  draftId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  provider: string;
  status: 'sent' | 'queued' | 'mock_delivered' | 'suppressed' | 'rejected_compliance' | 'failed';
  error?: string;
}

export interface IEmailProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  send(payload: SendEmailPayload): Promise<SendEmailResponse>;
}
