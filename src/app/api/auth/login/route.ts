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
    const adminPasskey = process.env.ADMIN_PASSWORD || 'Mshoaib6977.';
    const isMasterPasskey = password === adminPasskey;

    // 1. If Supabase is configured, authenticate through Supabase Auth
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Password required for Supabase authentication' },
          { status: 400 }
        );
      }

      let { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      // If credentials fail in Supabase but the operator used the authorized passkey,
      // auto-provision or sync the Supabase Auth user automatically.
      if (error && (error.message.includes('Invalid login credentials') || isMasterPasskey)) {
        try {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          const existingUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

          if (!existingUser) {
            // Auto-provision authorized admin in Supabase
            const { error: createErr } = await supabase.auth.admin.createUser({
              email: normalizedEmail,
              password,
              email_confirm: true,
              user_metadata: { name: 'Zia Ul Din', role: 'owner' },
            });

            if (!createErr) {
              const retry = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
              });
              if (!retry.error) {
                data = retry.data;
                error = null;
              }
            }
          } else if (isMasterPasskey) {
            // Update password in Supabase Auth to match operator passkey
            await supabase.auth.admin.updateUserById(existingUser.id, {
              password,
              email_confirm: true,
            });
            const retry = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            });
            if (!retry.error) {
              data = retry.data;
              error = null;
            }
          }
        } catch (syncErr) {
          console.warn('Supabase Auth auto-sync attempt encountered error:', syncErr);
        }
      }

      // If still error, but operator entered the verified admin passkey, allow session
      if (error) {
        if (isMasterPasskey) {
          // Allow fallback operator session
          const sessionToken = `operator_session_${Date.now()}_${Buffer.from(normalizedEmail).toString('base64url')}`;
          const response = NextResponse.json({
            success: true,
            message: 'Authenticated as authorized operator (Master Passkey Mode)',
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
    // Allows administrator ziauldin371@gmail.com with passkey to sign in directly
    if (password && !isMasterPasskey && process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid operator password' },
        { status: 401 }
      );
    }
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

