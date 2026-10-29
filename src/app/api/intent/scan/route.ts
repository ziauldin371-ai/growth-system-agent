import { NextResponse } from 'next/server';
import { intentRadarService } from '@/services/intent/intent-radar-service';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const scanResult = await intentRadarService.scanLiveIntentFeeds();
    return NextResponse.json({
      success: true,
      scannedCount: scanResult.scannedCount,
      hotOpportunitiesCount: scanResult.hotOpportunitiesCount,
      opportunities: scanResult.opportunities,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Live intent scan failed' },
      { status: 500 }
    );
  }
}

