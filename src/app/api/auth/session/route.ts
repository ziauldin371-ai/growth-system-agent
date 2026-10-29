import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('growth_agent_session')?.value;
  const sbAccessToken = req.cookies.get('sb-access-token')?.value;

  if (!sessionCookie && !sbAccessToken) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      email: 'ziauldin371@gmail.com',
      name: 'Zia Ul Din',
      role: 'owner',
      title: 'Full Stack AI Developer & Automation Architect',
    },
  });
}

