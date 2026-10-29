import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSessionToken } from '@/lib/security/session';
import { loginGuard } from '@/lib/security/login-guard';

let devGeneratedPassword: string | null = null;

function getExpectedAdminPassword(): string {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }
  if (!devGeneratedPassword) {
    devGeneratedPassword = crypto.randomBytes(16).toString('hex');
    console.log('\n================================================================');
    console.log('[SECURITY ALERT] No ADMIN_PASSWORD configured in environment.');
    console.log('[SECURITY ALERT] Generated temporary development admin password:');
    console.log(`[SECURITY ALERT] Password: ${devGeneratedPassword}`);
    console.log('[SECURITY ALERT] To set your own password, add ADMIN_PASSWORD=... to .env.local');
    console.log('================================================================\n');
  }
  return devGeneratedPassword;
}

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

    const isProduction = process.env.NODE_ENV === 'production';
    const supabase = getSupabaseAdmin();
    const expectedPassword = getExpectedAdminPassword();

    // 3. In production with Supabase: authenticate strictly via Supabase Auth
    if (isProduction) {
      if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication service unavailable: Supabase is required in production mode.',
          },
          { status: 503 }
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        const failed = loginGuard.recordFailedAttempt(ip, normalizedEmail);
        return NextResponse.json(
          {
            success: false,
            error: `Authentication failed: ${error?.message || 'Invalid credentials'}. Attempts remaining: ${failed.remainingAttempts}.`,
          },
          { status: 401 }
        );
      }

      // Successful auth in production
      loginGuard.resetAttempts(ip, normalizedEmail);
      const sessionToken = await createSessionToken({
        email: normalizedEmail,
        name: data.user.user_metadata?.name || 'Zia Ul Din',
        role: 'owner',
      });

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
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    }

    // 4. In development: support both Supabase Auth (if available) and local ADMIN_PASSWORD
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // First attempt Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data.user) {
        loginGuard.resetAttempts(ip, normalizedEmail);
        const sessionToken = await createSessionToken({
          email: normalizedEmail,
          name: 'Zia Ul Din',
          role: 'owner',
        });

        const response = NextResponse.json({
          success: true,
          message: 'Authentication successful (Supabase Dev Mode)',
          user: {
            email: normalizedEmail,
            name: 'Zia Ul Din',
            role: 'owner',
          },
        });

        response.cookies.set('growth_agent_session', sessionToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        return response;
      }

      // If Supabase failed or user doesn't exist, check against ADMIN_PASSWORD with constant-time comparison
      const isPasswordMatch = loginGuard.constantTimeCompare(password, expectedPassword);
      if (isPasswordMatch) {
        // Auto-sync or provision Supabase user with this passkey if desired
        try {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          const existingUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
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
          console.warn('[AUTH] Supabase user sync warning (non-fatal in dev):', syncErr);
        }

        loginGuard.resetAttempts(ip, normalizedEmail);
        const sessionToken = await createSessionToken({
          email: normalizedEmail,
          name: 'Zia Ul Din',
          role: 'owner',
        });

        const response = NextResponse.json({
          success: true,
          message: 'Authenticated as authorized operator (Passkey Mode)',
          user: {
            email: normalizedEmail,
            name: 'Zia Ul Din',
            role: 'owner',
          },
        });

        response.cookies.set('growth_agent_session', sessionToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        return response;
      }

      // Credentials failed both Supabase and ADMIN_PASSWORD
      const failed = loginGuard.recordFailedAttempt(ip, normalizedEmail);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid credentials. Please verify your password in .env.local (ADMIN_PASSWORD). Attempts remaining: ${failed.remainingAttempts}.`,
        },
        { status: 401 }
      );
    }

    // 5. Standalone / Local Dev without Supabase: verify against ADMIN_PASSWORD using constant-time comparison
    const isValid = loginGuard.constantTimeCompare(password, expectedPassword);
    if (!isValid) {
      const failed = loginGuard.recordFailedAttempt(ip, normalizedEmail);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid operator password. Attempts remaining: ${failed.remainingAttempts}.`,
        },
        { status: 401 }
      );
    }

    loginGuard.resetAttempts(ip, normalizedEmail);
    const sessionToken = await createSessionToken({
      email: normalizedEmail,
      name: 'Zia Ul Din',
      role: 'owner',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authenticated as authorized operator (Standalone Dev Mode)',
      user: {
        email: normalizedEmail,
        name: 'Zia Ul Din',
        role: 'owner',
      },
    });

    response.cookies.set('growth_agent_session', sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
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
