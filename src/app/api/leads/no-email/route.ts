import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';
    const list = await dataStore.getNoEmailBusinesses({ includeDemo });
    return NextResponse.json({
      success: true,
      total: list.length,
      businesses: list,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch no-email businesses' },
      { status: 500 }
    );
  }
}
