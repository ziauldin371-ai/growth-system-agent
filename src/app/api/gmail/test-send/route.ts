import { NextRequest, NextResponse } from 'next/server';
import { GmailProvider } from '@/services/email/providers/gmail-provider';
import { dataStore } from '@/services/repository/data-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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

    if (result.success && result.messageId) {
      // Record test email in dataStore
      dataStore.saveDraft({
        id: `test_draft_${Date.now()}`,
        businessId: 'system_operator',
        campaignId: 'diagnostic_test',
        recipientEmail,
        strategy: 'ai_automation',
        subjectLines: ['Growth System Agent — Gmail API Integration Verified', 'Gmail Integration Verified', 'System Test Verified'],
        selectedSubject: `Growth System Agent — Gmail API Integration Verified [${new Date().toISOString()}]`,
        emailBody: `Hi Zia,\n\nThis test message confirms that your Growth System Agent is successfully authorized with the official Google Gmail REST API.`,
        callToAction: 'Verify Sent folder',
        serviceOffer: 'AI & Automation Solutions',
        researchSummary: 'System diagnostic test dispatch',
        observations: [],
        warnings: [],
        confidenceRating: 1.0,
        version: 1,
        rationale: 'Gate 2 live deliverability test',
        status: 'sent',
        deliveryStatus: 'delivered',
        gmailMessageId: result.messageId,
        gmailThreadId: result.threadId,
        gmailConfirmed: true,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Record in Supabase send_events
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          await supabase.from('send_events').insert({
            recipient_email: recipientEmail,
            provider: 'gmail',
            provider_message_id: result.messageId,
            event_type: 'delivered',
            payload: {
              type: 'test_send',
              threadId: result.threadId,
              verifiedSent: (result as any).gmailConfirmed ?? true,
            },
          });
        } catch (e) {
          console.warn('Could not record send_event in Supabase:', e);
        }
      }
    }

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
