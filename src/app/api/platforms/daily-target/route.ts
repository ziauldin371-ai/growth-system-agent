import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const target = await dataStore.getDailyTarget();
    return NextResponse.json({ success: true, dailyTarget: target });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let target;
    if (body.action === 'increment') {
      target = await dataStore.incrementDailyProposals();
    } else if (typeof body.targetCount === 'number') {
      const today = new Date().toISOString().split('T')[0];
      target = await dataStore.getDailyTarget(today);
      target.targetCount = body.targetCount;
      // In Supabase / JsonStore, update targetCount
      const saved = await dataStore.incrementDailyProposals(); // or direct update
      saved.targetCount = body.targetCount;
      target = saved;
    } else {
      target = await dataStore.getDailyTarget();
    }
    return NextResponse.json({ success: true, dailyTarget: target });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
