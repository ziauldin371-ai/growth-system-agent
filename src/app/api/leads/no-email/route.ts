import { NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET() {
  try {
    const list = dataStore.getNoEmailBusinesses();
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

