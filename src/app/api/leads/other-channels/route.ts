import { NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET() {
  try {
    const records = await dataStore.getOtherOutreachOpportunities();
    return NextResponse.json({
      success: true,
      total: records.length,
      opportunities: records,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch alternative channel opportunities' },
      { status: 500 }
    );
  }
}

