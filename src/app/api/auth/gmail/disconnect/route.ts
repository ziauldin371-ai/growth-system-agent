import { NextRequest, NextResponse } from 'next/server';
import { tokenStore } from '@/services/repository/token-store';

export async function POST(req: NextRequest) {
  // Check operator session
  const sessionCookie = req.cookies.get('growth_agent_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ success: false, error: 'Unauthorized operator' }, { status: 401 });
  }

  const senderEmail = (process.env.ADMIN_EMAIL || 'ziauldin371@gmail.com').toLowerCase();

  try {
    const token = await tokenStore.getToken(senderEmail, 'gmail');
    if (token?.accessToken) {
      // Best-effort revoke at Google OAuth server
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token.accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch {
        // Continue even if network error
      }
    }

    await tokenStore.markTokenRevoked(senderEmail, 'gmail', 'Explicitly disconnected by operator');

    return NextResponse.json({
      success: true,
      message: 'Gmail account successfully disconnected and tokens marked as revoked.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Disconnect failed' },
      { status: 500 }
    );
  }
}

