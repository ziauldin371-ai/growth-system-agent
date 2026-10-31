import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { PlatformSpendLogEntity } from '@/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platformId = searchParams.get('platformId') || undefined;
    const logs = await dataStore.getPlatformSpendLogs(platformId);
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platformId, platformName, costType, amountSpent, currency, notes } = body;
    if (!platformId || typeof amountSpent !== 'number') {
      return NextResponse.json({ success: false, error: 'platformId and amountSpent required' }, { status: 400 });
    }

    const log: PlatformSpendLogEntity = {
      id: `spend_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      platformId,
      platformName: platformName || platformId,
      costType: costType || 'connects',
      amountSpent,
      currency: currency || 'USD',
      notes: notes || null,
      loggedAt: new Date().toISOString(),
    };

    await dataStore.recordPlatformSpend(log);
    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

