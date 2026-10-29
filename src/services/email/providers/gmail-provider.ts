import { IEmailProvider, SendEmailPayload, SendEmailResponse } from '../types';

/**
 * Gmail API Provider Adapter
 * Sends messages directly through official Google Gmail REST API using OAuth2 tokens.
 * Specifically configured for sender: ziauldin371@gmail.com (Zia Ul Din)
 */
export class GmailProvider implements IEmailProvider {
  public readonly id = 'gmail';
  public readonly name = 'Google Gmail API (OAuth2)';

  public readonly senderEmail = 'ziauldin371@gmail.com';
  public readonly senderName = 'Zia Ul Din | AI & Automation Solutions';

  public isConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    );
  }

  /**
   * Refreshes OAuth2 access token using client credentials and stored refresh token.
   */
  private async getAccessToken(): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google OAuth token refresh failed: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Encodes email headers, plain text, and HTML into an RFC 2822 MIME message
   * and formats it as a base64url string required by the Gmail API.
   */
  public createMimeMessage(payload: SendEmailPayload): string {
    const from = `${this.senderName} <${this.senderEmail}>`;
    const to = payload.to;
    const subject = payload.subject;
    const boundary = `boundary_${Date.now()}`;

    const plainText = payload.body;
    const htmlText = payload.metadata?.htmlBody || `<div style="font-family:sans-serif;line-height:1.6;color:#1e293b;">${plainText.replace(/\n/g, '<br/>')}</div>`;

    const mimeLines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
      `MIME-Version: 1.0`,
      `X-Idempotency-Key: ${payload.idempotencyKey}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      '',
      plainText,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      '',
      htmlText,
      '',
      `--${boundary}--`,
    ];

    const rawMime = mimeLines.join('\r\n');
    return Buffer.from(rawMime)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  public async send(payload: SendEmailPayload): Promise<SendEmailResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.id,
        status: 'failed',
        error: 'Gmail API is unconfigured: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN is missing. Please configure Google OAuth2 in .env.local to enable Gmail sending for ziauldin371@gmail.com.',
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const rawMessage = this.createMimeMessage(payload);

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          provider: this.id,
          status: 'failed',
          error: `Gmail API error (${response.status}): ${errText}`,
        };
      }

      const data = await response.json();
      const messageId = data.id;
      const threadId = data.threadId;
      const gmailUrl = `https://mail.google.com/mail/u/0/#sent/${messageId}`;

      return {
        success: true,
        provider: this.id,
        messageId,
        threadId,
        gmailUrl,
        status: 'sent',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        status: 'failed',
        error: `Gmail send exception: ${err.message}`,
      };
    }
  }

  /**
   * Actionable setup checklist for administrator verification.
   */
  public getSetupChecklist() {
    return {
      senderEmail: this.senderEmail,
      senderName: this.senderName,
      isConfigured: this.isConfigured(),
      checks: [
        {
          key: 'GOOGLE_CLIENT_ID',
          label: 'Google OAuth Client ID',
          configured: Boolean(process.env.GOOGLE_CLIENT_ID),
          helpText: 'From Google Cloud Console > APIs & Services > Credentials (OAuth 2.0 Client ID)',
        },
        {
          key: 'GOOGLE_CLIENT_SECRET',
          label: 'Google OAuth Client Secret',
          configured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
          helpText: 'Client Secret paired with the Web Client ID',
        },
        {
          key: 'GOOGLE_REFRESH_TOKEN',
          label: 'Authorized Refresh Token',
          configured: Boolean(process.env.GOOGLE_REFRESH_TOKEN),
          helpText: 'OAuth2 refresh token generated with https://www.googleapis.com/auth/gmail.send',
        },
      ],
      requiredScope: 'https://www.googleapis.com/auth/gmail.send',
      sentFolderUrl: 'https://mail.google.com/mail/u/0/#sent',
    };
  }

  /**
   * Dispatches a real verification test email to verify credentials and Sent folder placement.
   */
  public async sendTestEmail(recipientEmail: string = 'ziauldin371@gmail.com'): Promise<{
    success: boolean;
    messageId?: string;
    threadId?: string;
    gmailUrl?: string;
    error?: string;
    checklist?: any;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Cannot dispatch live test email: Gmail OAuth credentials are not fully configured in environment.',
        checklist: this.getSetupChecklist(),
      };
    }

    const testPayload: SendEmailPayload = {
      to: recipientEmail,
      subject: `Growth System Agent — Gmail API Integration Verified [${new Date().toISOString()}]`,
      body: `Hi Zia,\n\nThis test message confirms that your Growth System Agent is successfully authorized with the official Google Gmail REST API.\n\nSender Account: ${this.senderEmail}\nTimestamp: ${new Date().toISOString()}\nDelivery Channel: Gmail API (users/me/messages/send)\n\nThis message has been placed directly into your Gmail account's Sent folder.\n\nBest regards,\nGrowth System Agent Engine`,
      idempotencyKey: `test_send_${Date.now()}`,
    };

    const res = await this.send(testPayload);
    return {
      success: res.success,
      messageId: res.messageId,
      threadId: res.threadId,
      gmailUrl: res.gmailUrl,
      error: res.error,
      checklist: this.getSetupChecklist(),
    };
  }
}

