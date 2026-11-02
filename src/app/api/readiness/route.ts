import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { tokenStore } from '@/services/repository/token-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  const isAdminConfigured = Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0);
  const senderEmail = (process.env.ADMIN_EMAIL || 'ziauldin371@gmail.com').toLowerCase();
  const oauthToken = await tokenStore.getToken(senderEmail, 'gmail');
  const isGmailConfigured = Boolean((oauthToken && oauthToken.status === 'active') || (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN));
  const isPlacesConfigured = Boolean(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY.trim().length > 0);
  const isGeoapifyConfigured = Boolean(process.env.GEOAPIFY_API_KEY && process.env.GEOAPIFY_API_KEY.trim().length > 0);
  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const isSchedulerSecretConfigured = Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.trim().length > 0);
  const isAddressConfigured = Boolean(process.env.PHYSICAL_MAILING_ADDRESS && process.env.PHYSICAL_MAILING_ADDRESS.trim().length > 0);
  const sendMode = process.env.DEFAULT_SEND_MODE || 'approval';

  const discoveryProvider = (process.env.DISCOVERY_PROVIDER || (isPlacesConfigured ? 'google' : 'osm')).toLowerCase();
  const isDiscoveryReady = discoveryProvider === 'osm' || isPlacesConfigured || isGeoapifyConfigured;

  const missing: string[] = [];
  const configured: string[] = [];

  if (isDbConnected) configured.push('database'); else missing.push('database');
  if (isAdminConfigured) configured.push('admin_auth'); else missing.push('admin_auth');
  if (isSchedulerSecretConfigured) configured.push('scheduler_secret'); else missing.push('scheduler_secret');
  if (isDiscoveryReady) configured.push('places_key'); else missing.push('places_key');
  if (isGeminiConfigured) configured.push('gemini_key'); else missing.push('gemini_key');
  if (isGmailConfigured) configured.push('gmail'); else missing.push('gmail');
  if (isAddressConfigured) configured.push('mailing_address'); else missing.push('mailing_address');

  const isFullyReady = missing.length === 0;

  return NextResponse.json({
    success: true,
    ready: isFullyReady,
    status: isFullyReady ? 'ready' : 'not_ready',
    missing,
    configured,
    discovery: {
      activeProvider: isPlacesConfigured && discoveryProvider !== 'osm' ? 'google_places' : (isGeoapifyConfigured && discoveryProvider === 'geoapify' ? 'geoapify' : 'osm'),
      isOsmActive: !isPlacesConfigured || discoveryProvider === 'osm',
      isGoogleConfigured: isPlacesConfigured,
      isGeoapifyConfigured,
    },
    services: {
      database: isDbConnected ? 'connected' : 'missing',
      admin_auth: isAdminConfigured ? 'configured' : 'missing',
      scheduler_secret: isSchedulerSecretConfigured ? 'configured' : 'missing',
      places_key: isDiscoveryReady ? 'configured' : 'missing',
      gemini_key: isGeminiConfigured ? 'configured' : 'missing',
      gmail: isGmailConfigured ? 'configured' : 'missing',
      mailing_address: isAddressConfigured ? 'configured' : 'missing',
      auto_send: sendMode === 'auto_send' ? 'active' : 'approval_mode',
    },
    checkedAt: new Date().toISOString(),
  });
}
