import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify authorized administrator identity
    const expectedAdmin = (process.env.ADMIN_EMAIL || 'ziauldin371@gmail.com').toLowerCase();
    if (normalizedEmail !== expectedAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: `Access restricted. Only authorized operator (${expectedAdmin}) is permitted to log in.`,
        },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. If Supabase is configured, authenticate through Supabase Auth
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Password required for Supabase authentication' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return NextResponse.json(
          { success: false, error: `Supabase Auth error: ${error.message}` },
          { status: 401 }
        );
      }

      const sessionToken = data.session?.access_token || `token_${Date.now()}`;
      const response = NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user: {
          email: normalizedEmail,
          name: 'Zia Ul Din',
          role: 'owner',
        },
      });

      response.cookies.set('growth_agent_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    }

    // 2. Development / Standalone Mode (Zero-credential safe fallback)
    // Allows administrator ziauldin371@gmail.com to sign in directly
    const sessionToken = `local_session_${Date.now()}_${Buffer.from(normalizedEmail).toString('base64url')}`;
    const response = NextResponse.json({
      success: true,
      message: 'Authenticated as authorized operator (Local Session Mode)',
      user: {
        email: normalizedEmail,
        name: 'Zia Ul Din',
        role: 'owner',
      },
    });

    response.cookies.set('growth_agent_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Login failed' },
      { status: 500 }
    );
  }
}

