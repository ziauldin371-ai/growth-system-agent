import { NextRequest, NextResponse } from 'next/server';
import { GmailProvider } from '@/services/email/providers/gmail-provider';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const recipientEmail = body.recipientEmail || 'ziauldin371@gmail.com';

    const gmailProvider = new GmailProvider();
    const isReady = await gmailProvider.isConfiguredAsync();

    if (!isReady) {
      return NextResponse.json({
        success: false,
        isConfigured: false,
        message: 'Gmail API is not yet configured. Please configure Google OAuth2 credentials to send live test emails.',
        checklist: await gmailProvider.getSetupChecklistAsync(),
      });
    }

    const result = await gmailProvider.sendTestEmail(recipientEmail);

    return NextResponse.json({
      ...result,
      isConfigured: true,
      sender: gmailProvider.senderEmail,
      recipient: recipientEmail,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gmail test send failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const gmailProvider = new GmailProvider();
  const isReady = await gmailProvider.isConfiguredAsync();
  return NextResponse.json({
    isConfigured: isReady,
    checklist: await gmailProvider.getSetupChecklistAsync(),
  });
}
