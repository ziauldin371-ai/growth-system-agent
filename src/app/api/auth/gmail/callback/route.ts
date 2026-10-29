import { NextRequest, NextResponse } from 'next/server';
import { tokenStore } from '@/services/repository/token-store';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const storedState = req.cookies.get('gmail_oauth_state')?.value;

  if (error) {
    return NextResponse.json(
      { success: false, error: `Google OAuth error: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Authorization code missing from Google redirect' },
      { status: 400 }
    );
  }

  if (storedState && state && storedState !== state) {
    return NextResponse.json(
      { success: false, error: 'OAuth state mismatch (potential CSRF)' },
      { status: 403 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { success: false, error: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured' },
      { status: 500 }
    );
  }

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/gmail/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json(
        { success: false, error: `Token exchange failed: ${errText}` },
        { status: tokenRes.status }
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    if (!refresh_token) {
      console.warn('Warning: Google did not return a refresh token (user may have previously granted access).');
    }

    // Verify authorized sender email
    const senderEmail = (process.env.ADMIN_EMAIL || 'ziauldin371@gmail.com').toLowerCase();

    // Store encrypted tokens
    await tokenStore.saveToken({
      userEmail: senderEmail,
      provider: 'gmail',
      accessToken: access_token,
      refreshToken: refresh_token || access_token,
      expiresInSeconds: expires_in || 3600,
      scopes: scope ? scope.split(' ') : ['https://www.googleapis.com/auth/gmail.send'],
    });

    const response = NextResponse.redirect(new URL('/?gmail_connected=true', req.url));
    response.cookies.delete('gmail_oauth_state');
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'OAuth flow failed' },
      { status: 500 }
    );
  }
}

