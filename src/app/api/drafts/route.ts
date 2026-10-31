import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const campaignId = searchParams.get('campaignId') || undefined;
    const includeDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

    const drafts = await dataStore.getDrafts({ status, campaignId, includeDemo });
    return NextResponse.json({
      success: true,
      total: drafts.length,
      drafts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

