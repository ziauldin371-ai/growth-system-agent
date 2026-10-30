import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { verifyUnsubscribeToken } from '@/lib/security/unsubscribe-token';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const directEmail = req.nextUrl.searchParams.get('email');

  let targetEmail: string | null = null;

  if (token) {
    const verified = verifyUnsubscribeToken(token);
    if (!verified.valid || !verified.email) {
      return NextResponse.json(
        { success: false, error: verified.error || 'Invalid or expired unsubscribe token' },
        { status: 400 }
      );
    }
    targetEmail = verified.email;
  } else if (directEmail && directEmail.includes('@')) {
    targetEmail = directEmail.trim().toLowerCase();
  } else {
    return NextResponse.json(
      { success: false, error: 'Valid signed token parameter is required' },
      { status: 400 }
    );
  }

  // Register on suppression list
  await dataStore.addSuppression({
    id: `sup_unsub_${crypto.randomBytes(6).toString('hex')}`,
    organizationId: 'org_growth_system_main',
    type: 'email',
    value: targetEmail,
    reason: 'unsubscribe',
    notes: 'Recipient invoked verified unsubscribe link (HMAC signed token).',
    createdAt: new Date().toISOString(),
  });

  // If request accepts JSON or curl, return JSON
  const acceptHeader = req.headers.get('accept') || '';
  if (acceptHeader.includes('application/json') || req.headers.get('user-agent')?.includes('curl')) {
    return NextResponse.json({
      success: true,
      message: 'Opt-out confirmed. Email address registered on permanent suppression list.',
      email: targetEmail,
      suppressedAt: new Date().toISOString(),
    });
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Unsubscribed — Growth System Agent</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
    h1 { color: #10b981; font-size: 22px; margin-bottom: 12px; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
    .email-badge { background: #0f172a; border: 1px solid #334155; padding: 6px 12px; border-radius: 6px; font-family: monospace; color: #38bdf8; display: inline-block; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Opt-Out Confirmed</h1>
    <p>You have been successfully removed from our communication lists.</p>
    <div class="email-badge">${targetEmail}</div>
    <p>Your address has been placed on our permanent suppression register. You will receive no further outreach messages from our platform.</p>
  </div>
</body>
</html>
  `.trim();

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
