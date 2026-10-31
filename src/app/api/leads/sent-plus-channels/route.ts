import { NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET() {
  try {
    const list = await dataStore.getEmailSentPlusOtherChannels();
    return NextResponse.json({
      success: true,
      total: list.length,
      multiChannelTargets: list,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch email sent plus other channels' },
      { status: 500 }
    );
  }
}

