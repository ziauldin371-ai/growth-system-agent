import { NextRequest, NextResponse } from 'next/server';
import { hotRequestEngine } from '@/services/marketplace/hot-request-engine';
import { dataStore } from '@/services/repository/data-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform') || undefined;
    const minFit = searchParams.get('minFit') ? Number(searchParams.get('minFit')) : undefined;
    const status = searchParams.get('status') || undefined;

    const requests = await dataStore.getHotRequests({ platform, minFit, status });
    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText, platform, postUrl } = body;
    if (!rawText) {
      return NextResponse.json({ success: false, error: 'rawText is required' }, { status: 400 });
    }

    const request = hotRequestEngine.parsePastedJob(
      rawText,
      platform || 'Upwork',
      postUrl || 'https://www.upwork.com/'
    );

    return NextResponse.json({ success: true, request });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status required' }, { status: 400 });
    }

    const ok = await dataStore.updateHotRequestStatus(id, status);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

