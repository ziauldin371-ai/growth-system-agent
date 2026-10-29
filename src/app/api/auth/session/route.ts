import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/security/session';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('growth_agent_session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  const verification = await verifySessionToken(sessionCookie);

  if (!verification.valid || !verification.payload) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      error: 'Invalid or expired session token',
    }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      email: verification.payload.email,
      name: verification.payload.name,
      role: verification.payload.role,
      title: 'Full Stack AI Developer & Automation Architect',
    },
  });
}
