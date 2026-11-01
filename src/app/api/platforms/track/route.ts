import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.platformId) {
      return NextResponse.json({ success: false, error: 'platformId is required' }, { status: 400 });
    }

    const saved = await dataStore.savePlatformTracker({
      platformId: body.platformId,
      status: body.status,
      myProfileUrl: body.myProfileUrl,
      notes: body.notes,
      lastActionDate: body.lastActionDate || new Date().toISOString(),
      followUpDate: body.followUpDate,
      checklist: body.checklist,
      customPitch: body.customPitch,
    });

    // If status changed to applied or proposals_sent, optionally bump daily proposals
    if (body.status === 'proposals_sent' || body.status === 'applied') {
      await dataStore.incrementDailyProposals();
    }

    const updatedDailyTarget = await dataStore.getDailyTarget();

    return NextResponse.json({
      success: true,
      tracker: saved,
      dailyTarget: updatedDailyTarget,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
