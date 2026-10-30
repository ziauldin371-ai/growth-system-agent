import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSessionToken } from '@/lib/security/session';
import { loginGuard } from '@/lib/security/login-guard';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               req.headers.get('x-real-ip') ||
               '127.0.0.1';

    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. IP-based rate limiting check (5 attempts per 15 minutes)
    const lockStatus = loginGuard.isLocked(ip, normalizedEmail);
    if (lockStatus.locked) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Account temporarily locked for security. Please retry in ${lockStatus.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // 2. Verify authorized administrator email
    const expectedAdmin = (process.env.ADMIN_EMAIL || 'ziauldin371@gmail.com').toLowerCase();
    if (normalizedEmail !== expectedAdmin) {
      const failed = loginGuard.recordFailedAttempt(ip, normalizedEmail);
      return NextResponse.json(
        {
          success: false,
          error: `Access restricted. Only authorized operator (${expectedAdmin}) is permitted to log in. Attempts remaining: ${failed.remainingAttempts}.`,
        },
        { status: 403 }
      );
    }

    // 3. Strict enforcement: ADMIN_PASSWORD MUST be set in environment (both in dev and prod)
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword || typeof expectedPassword !== 'string' || expectedPassword.trim() === '') {
      console.error('[SECURITY ALERT] ADMIN_PASSWORD environment variable is not configured. Rejecting login.');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication configuration error: ADMIN_PASSWORD environment variable is not set.',
        },
        { status: 500 }
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const supabase = getSupabaseAdmin();

    // 4. Authenticate against Supabase Auth (if available) or ADMIN_PASSWORD (timing-safe)
    let authenticated = false;
    let authSource = 'standalone';

    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data.user) {
        authenticated = true;
        authSource = 'supabase';
      }
    }

    // If not authenticated via Supabase Auth, verify against configured ADMIN_PASSWORD using constant-time comparison
    if (!authenticated) {
      const isPasswordMatch = loginGuard.constantTimeCompare(password, expectedPassword);
      if (isPasswordMatch) {
        authenticated = true;
        authSource = 'admin_password';

        // Auto-sync or provision the operator into Supabase Auth if Supabase is connected
        if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          try {
            const { data: usersData } = await supabase.auth.admin.listUsers();
            const existingUser = usersData?.users?.find(
              (u: any) => u.email?.toLowerCase() === normalizedEmail
            );
            if (!existingUser) {
              await supabase.auth.admin.createUser({
                email: normalizedEmail,
                password,
                email_confirm: true,
                user_metadata: { name: 'Zia Ul Din', role: 'owner' },
              });
            } else {
              await supabase.auth.admin.updateUserById(existingUser.id, {
                password,
                email_confirm: true,
              });
            }
          } catch (syncErr) {
            console.warn('[AUTH] Supabase user sync warning (non-fatal):', syncErr);
          }
        }
      }
    }

    if (!authenticated) {
      const failed = loginGuard.recordFailedAttempt(ip, normalizedEmail);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid credentials. Attempts remaining: ${failed.remainingAttempts}.`,
        },
        { status: 401 }
      );
    }

    // Successful login: reset failed attempts and generate cryptographically signed session
    loginGuard.resetAttempts(ip, normalizedEmail);
    const sessionToken = await createSessionToken({
      email: normalizedEmail,
      name: 'Zia Ul Din',
      role: 'owner',
    });

    const response = NextResponse.json({
      success: true,
      message: `Authentication successful (${authSource})`,
      user: {
        email: normalizedEmail,
        name: 'Zia Ul Din',
        role: 'owner',
      },
    });

    response.cookies.set('growth_agent_session', sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Authentication error' },
      { status: 500 }
    );
  }
}
