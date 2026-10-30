import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';
    const sent = await dataStore.getSentEmails({ includeDemo });
    return NextResponse.json({
      success: true,
      total: sent.length,
      emails: sent,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch sent emails' },
      { status: 500 }
    );
  }
}
