import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');

  if (!email || !email.includes('@')) {
    return new NextResponse('Invalid or missing unsubscribe address', { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();

  dataStore.addSuppression({
    id: `sup_unsub_${crypto.randomBytes(6).toString('hex')}`,
    organizationId: 'org-demo-001',
    type: 'email',
    value: cleanEmail,
    reason: 'unsubscribe',
    notes: 'Recipient clicked self-service unsubscribe link.',
    createdAt: new Date().toISOString(),
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Unsubscribed — GrowthSignal AI</title>
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
    <div class="email-badge">${cleanEmail}</div>
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
