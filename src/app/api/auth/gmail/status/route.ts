import { NextRequest, NextResponse } from 'next/server';
import { tokenStore } from '@/services/repository/token-store';

export async function GET(req: NextRequest) {
  // Check operator session
  const sessionCookie = req.cookies.get('growth_agent_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ success: false, error: 'Unauthorized operator' }, { status: 401 });
  }

  const senderEmail = (process.env.ADMIN_EMAIL || 'ziauldin371@gmail.com').toLowerCase();
  const token = await tokenStore.getToken(senderEmail, 'gmail');

  if (token && token.status === 'active') {
    return NextResponse.json({
      success: true,
      connected: true,
      provider: 'gmail',
      email: senderEmail,
      status: 'active',
      expiresAt: token.expiresAt,
      mode: 'in_app_oauth',
    });
  }

  if (token && token.status === 'revoked') {
    return NextResponse.json({
      success: true,
      connected: false,
      provider: 'gmail',
      email: senderEmail,
      status: 'revoked',
      mode: 'in_app_oauth',
      message: 'Gmail OAuth token has been revoked. Please reconnect your account.',
    });
  }

  // Fallback to env refresh token if configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    return NextResponse.json({
      success: true,
      connected: true,
      provider: 'gmail',
      email: senderEmail,
      status: 'active',
      mode: 'env_credentials',
    });
  }

  return NextResponse.json({
    success: true,
    connected: false,
    provider: 'gmail',
    email: senderEmail,
    status: 'not_connected',
    message: 'Gmail account not connected. Use the Connect Gmail button to authorize sending.',
  });
}
