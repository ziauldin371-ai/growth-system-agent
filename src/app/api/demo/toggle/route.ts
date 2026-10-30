import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET() {
  const hasDemo = Boolean(dataStore.hasDemoData ? dataStore.hasDemoData() : false);
  return NextResponse.json({
    success: true,
    hasDemoData: hasDemo,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const enabled = Boolean(body.enabled);

    if (enabled) {
      if (dataStore.seedDemoData) {
        await dataStore.seedDemoData();
      }
    } else {
      if (dataStore.clearDemoData) {
        await dataStore.clearDemoData();
      }
    }

    const hasDemo = Boolean(dataStore.hasDemoData ? dataStore.hasDemoData() : false);

    return NextResponse.json({
      success: true,
      enabled,
      hasDemoData: hasDemo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to toggle demo data' },
      { status: 500 }
    );
  }
}

