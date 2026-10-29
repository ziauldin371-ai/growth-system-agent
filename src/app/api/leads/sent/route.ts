import { NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET() {
  try {
    const sent = dataStore.getSentEmails();
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

