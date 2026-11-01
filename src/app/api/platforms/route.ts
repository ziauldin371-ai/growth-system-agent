import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { CLIENT_PLATFORMS, LOCAL_BUSINESS_CHANNELS } from '@/data/platforms-registry';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get('group');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase().trim();

    // Load trackers, daily target, and profile in parallel
    const [trackers, dailyTarget, profile] = await Promise.all([
      dataStore.getPlatformTrackers(),
      dataStore.getDailyTarget(),
      dataStore.getOperatorProfile(),
    ]);

    let platforms = CLIENT_PLATFORMS.map((p) => {
      const trk = trackers[p.id];
      return {
        ...p,
        tracker: trk || {
          platformId: p.id,
          status: 'not_started',
          myProfileUrl: null,
          notes: null,
          lastActionDate: null,
          followUpDate: null,
          checklist: {
            headline: false,
            bio: false,
            portfolio: false,
            rates: false,
            skills: false,
            verification: false,
            payout: false,
          },
          customPitch: null,
        },
      };
    });

    if (group && group !== 'all') {
      platforms = platforms.filter((p) => p.group === group);
    }
    if (priority && priority !== 'all') {
      platforms = platforms.filter((p) => p.priority.toLowerCase() === priority.toLowerCase());
    }
    if (status && status !== 'all') {
      platforms = platforms.filter((p) => (p.tracker?.status || 'not_started') === status);
    }
    if (search) {
      platforms = platforms.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.howClientsFound.toLowerCase().includes(search) ||
          p.groupName.toLowerCase().includes(search) ||
          p.whatISend.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      total: platforms.length,
      platforms,
      trackers,
      dailyTarget,
      profile,
      localChannels: LOCAL_BUSINESS_CHANNELS,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
