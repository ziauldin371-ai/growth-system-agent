import { NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET() {
  try {
    const runs = dataStore.getSchedulerRuns();
    return NextResponse.json({
      success: true,
      total: runs.length,
      runs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch run history' },
      { status: 500 }
    );
  }
}

