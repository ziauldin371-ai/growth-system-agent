import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifySessionToken } from '@/lib/security/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authenticate: Session Cookie or Authorization Bearer header
  let isAuthenticated = false;

  const sessionCookie = req.cookies.get('growth_agent_session')?.value || req.cookies.get('admin_session')?.value;
  if (sessionCookie) {
    const verified = await verifySessionToken(sessionCookie);
    if (verified.valid) {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const adminPassword = process.env.ADMIN_PASSWORD;
      const cronSecret = process.env.CRON_SECRET;
      if (
        (adminPassword && token === adminPassword) ||
        (cronSecret && token === cronSecret)
      ) {
        isAuthenticated = true;
      }
    }
  }

  if (!isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Authentication required to inspect system readiness.' },
      { status: 401 }
    );
  }

  // 2. Check each required production service
  let isDbConnected = false;
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase.from('scheduler_run_history').select('id').limit(1);
      if (!error) {
        isDbConnected = true;
      }
    } catch {
      isDbConnected = false;
    }
  }

  const isGmailConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);
  const isPlacesConfigured = Boolean(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY.trim().length > 0);
  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const isSchedulerSecretConfigured = Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.trim().length > 0);

  const missing: string[] = [];
  const configured: string[] = [];

  if (isDbConnected) {
    configured.push('database');
  } else {
    missing.push('database');
  }

  if (isGmailConfigured) {
    configured.push('gmail');
  } else {
    missing.push('gmail');
  }

  if (isPlacesConfigured) {
    configured.push('places_key');
  } else {
    missing.push('places_key');
  }

  if (isGeminiConfigured) {
    configured.push('gemini_key');
  } else {
    missing.push('gemini_key');
  }

  if (isSchedulerSecretConfigured) {
    configured.push('scheduler_secret');
  } else {
    missing.push('scheduler_secret');
  }

  const isFullyReady = missing.length === 0;

  return NextResponse.json({
    success: true,
    ready: isFullyReady,
    status: isFullyReady ? 'ready' : 'not_ready',
    missing,
    configured,
    services: {
      database: isDbConnected ? 'connected' : 'missing',
      gmail: isGmailConfigured ? 'configured' : 'missing',
      places_key: isPlacesConfigured ? 'configured' : 'missing',
      gemini_key: isGeminiConfigured ? 'configured' : 'missing',
      scheduler_secret: isSchedulerSecretConfigured ? 'configured' : 'missing',
    },
    checkedAt: new Date().toISOString(),
  });
}

