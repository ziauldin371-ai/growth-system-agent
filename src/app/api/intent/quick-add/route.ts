import { NextRequest, NextResponse } from 'next/server';
import { intentRadarService } from '@/services/intent/intent-radar-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.rawText || !body.sourceUrl) {
      return NextResponse.json(
        { success: false, error: 'Both rawText and sourceUrl are required for Manual Quick Add.' },
        { status: 400 }
      );
    }

    const opportunity = intentRadarService.quickAddManualLead({
      sourceUrl: body.sourceUrl,
      rawText: body.rawText,
      platform: body.platform || 'other_manual',
      authorOrPoster: body.authorOrPoster,
      statedTitle: body.statedTitle,
    });

    return NextResponse.json({
      success: true,
      message: 'Warm intent opportunity imported and classified successfully',
      opportunity,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Quick add failed' },
      { status: 500 }
    );
  }
}

