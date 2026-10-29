import { NextRequest, NextResponse } from 'next/server';
import { webhookVerifier, WebhookEventPayload } from '@/services/email/webhook-verifier';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('svix-signature') || req.headers.get('x-webhook-signature');
    const secret = process.env.RESEND_WEBHOOK_SECRET || process.env.WEBHOOK_SIGNING_SECRET || 'test_webhook_signing_secret';

    const isValid = webhookVerifier.verifySignature(rawBody, signature, secret);

    // In production, reject unverified signatures.
    // If running in development without configured secret, allow testing with notice.
    if (!isValid && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload: WebhookEventPayload = JSON.parse(rawBody);
    const result = await webhookVerifier.processEvent(payload);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to process webhook',
    }, { status: 400 });
  }
}
