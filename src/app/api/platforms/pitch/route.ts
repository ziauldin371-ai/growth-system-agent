import { NextRequest, NextResponse } from 'next/server';
import { perPlatformPitchEngine } from '@/services/ai/per-platform-pitch-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      platform,
      pitchMode,
      companyName,
      domain,
      contactName,
      title,
      observedSignal,
      signalSourceUrl,
      signalDate,
      nicheId,
      country,
      approvedProof,
    } = body;

    if (!platform || !pitchMode || !companyName) {
      return NextResponse.json({ success: false, error: 'platform, pitchMode, and companyName required' }, { status: 400 });
    }

    const pitch = perPlatformPitchEngine.generatePitch({
      platform,
      pitchMode,
      companyName,
      domain,
      contactName,
      title,
      observedSignal,
      signalSourceUrl,
      signalDate,
      nicheId,
      country,
      approvedProof,
    });

    return NextResponse.json({ success: true, pitch });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
