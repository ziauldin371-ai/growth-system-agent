import { NextRequest, NextResponse } from 'next/server';
import { intentRadarService } from '@/services/intent/intent-radar-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const opportunities = intentRadarService.getHotOpportunities(50);
    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch intent opportunities' },
      { status: 500 }
    );
  }
}
