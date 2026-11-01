import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { SEED_LEAD_SOURCES } from '@/data/lead-sources-registry';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const accessTier = searchParams.get('accessTier') || undefined;
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;

    let sources = await dataStore.getLeadSources({
      accessTier,
      category,
      status,
    });

    if (!sources || sources.length === 0) {
      sources = SEED_LEAD_SOURCES;
    }

    const tierCounts = {
      tier_a_auto: sources.filter(s => s.accessTier === 'tier_a_auto').length,
      tier_b_manual: sources.filter(s => s.accessTier === 'tier_b_manual').length,
      tier_c_link: sources.filter(s => s.accessTier === 'tier_c_link').length,
      expert_network_excluded: sources.filter(s => s.accessTier === 'expert_network_excluded').length,
    };

    return NextResponse.json({
      success: true,
      total: sources.length,
      tierCounts,
      sources,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status required' }, { status: 400 });
    }

    await dataStore.updateLeadSourceStatus(id, status, new Date().toISOString(), notes);
    const updated = await dataStore.getLeadSourceById(id);
    return NextResponse.json({ success: true, source: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
