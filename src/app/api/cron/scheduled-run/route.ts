import { NextRequest, NextResponse } from 'next/server';
import { automationRunner } from '@/services/scheduler/automation-runner';

function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // If no CRON_SECRET is configured in development, allow execution with warning
  if (!cronSecret && process.env.NODE_ENV !== 'production') {
    return true;
  }

  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;
  const querySecret = req.nextUrl.searchParams.get('secret');

  if (bearerToken && bearerToken === cronSecret) return true;
  if (querySecret && querySecret === cronSecret) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized: Invalid or missing CRON_SECRET',
    }, { status: 401 });
  }

  try {
    const result = await automationRunner.executeScheduledRun('vercel_cron');
    return NextResponse.json({
      success: true,
      message: 'Scheduled automation run completed successfully',
      result,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Scheduler execution failed',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

