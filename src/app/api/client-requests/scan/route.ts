import { NextRequest, NextResponse } from 'next/server';
import { runClientRequestsScan } from '@/services/client-requests/request-pipeline';

export async function POST(req: NextRequest) {
  try {
    let options = {};
    try {
      const body = await req.json();
      options = body || {};
    } catch {
      // empty body is fine
    }

    const result = await runClientRequestsScan(options);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Scan failed' },
      { status: 500 }
    );
  }
}
