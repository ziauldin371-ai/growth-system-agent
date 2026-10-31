import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { automationRunner } from '@/services/scheduler/automation-runner';

function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  // 1. If query param contains secret, reject with 400
  if (req.nextUrl.searchParams.has('secret')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Secret must be provided in Authorization header, not in query string',
      },
      { status: 400 }
    );
  }

  // 2. Ensure CRON_SECRET is configured; fail closed with 503 if not
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'CRON_SECRET not configured',
      },
      { status: 503 }
    );
  }

  // 3. Extract and validate Authorization: Bearer <secret> header
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header. Expected "Authorization: Bearer <secret>"',
      },
      { status: 401 }
    );
  }

  const bearerSecret = authHeader.replace(/^Bearer\s+/i, '').trim();
  const isValid = constantTimeCompare(bearerSecret, configuredSecret);

  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Invalid CRON_SECRET token',
      },
      { status: 401 }
    );
  }

  try {
    const result = await automationRunner.executeScheduledRun('vercel_cron');
    return NextResponse.json({
      success: true,
      status: result.status,
      reason: result.reason || null,
      message: result.status === 'skipped' ? `Run skipped: ${result.reason}` : 'Scheduled automation run completed successfully',
      result,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Scheduler execution failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // If request contains secret in body, reject with 400
  try {
    const body = await req.clone().json().catch(() => null);
    if (body && typeof body === 'object' && 'secret' in body) {
      return NextResponse.json(
        {
          success: false,
          error: 'Secret must be provided in Authorization header, not in request body',
        },
        { status: 400 }
      );
    }
  } catch {
    // Ignore JSON parse errors for non-json POST
  }

  return GET(req);
}
