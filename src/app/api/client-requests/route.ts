import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { extractLeadFromPost, extractLeadFromScreenshot, parseCsvIntake } from '@/services/client-requests/manual-intake';
import { generatePitchVariants } from '@/services/client-requests/pitch-generator';
import { ClientRequestEntity } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const platform = searchParams.get('platform') || undefined;
    const status = searchParams.get('status') || undefined;
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : undefined;
    const hasEmail = searchParams.get('hasEmail') === 'true';
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const requests = await dataStore.getClientRequests({
      platform,
      status,
      minScore,
      hasEmail,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      total: requests.length,
      requests,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch client requests' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'paste';

    if (action === 'paste') {
      const { rawText, sourceUrl, sourcePlatform } = body;
      if (!rawText || !rawText.trim()) {
        return NextResponse.json({ success: false, error: 'Post text is required' }, { status: 400 });
      }

      const extracted = await extractLeadFromPost(rawText, sourceUrl || '', sourcePlatform || 'Manual Paste');
      const operatorProfile = await dataStore.getOperatorProfile();
      const pitches = await generatePitchVariants(extracted, operatorProfile);
      extracted.pitches = pitches;

      await dataStore.saveClientRequest(extracted);
      await dataStore.recordRequestEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestId: extracted.id,
        eventType: 'created',
        notes: `Captured via paste from ${extracted.sourcePlatform}`,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        request: extracted,
      });
    }

    if (action === 'screenshot') {
      const { imageBase64, mimeType, sourceUrl, sourcePlatform } = body;
      if (!imageBase64) {
        return NextResponse.json({ success: false, error: 'Screenshot image is required' }, { status: 400 });
      }

      const extracted = await extractLeadFromScreenshot(
        imageBase64,
        mimeType || 'image/png',
        sourceUrl || '',
        sourcePlatform || 'Screenshot'
      );
      const operatorProfile = await dataStore.getOperatorProfile();
      const pitches = await generatePitchVariants(extracted, operatorProfile);
      extracted.pitches = pitches;

      await dataStore.saveClientRequest(extracted);
      await dataStore.recordRequestEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestId: extracted.id,
        eventType: 'created',
        notes: `Captured via screenshot from ${extracted.sourcePlatform}`,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        request: extracted,
      });
    }

    if (action === 'csv') {
      const { csvContent } = body;
      if (!csvContent) {
        return NextResponse.json({ success: false, error: 'CSV content is required' }, { status: 400 });
      }

      const leads = await parseCsvIntake(csvContent);
      const operatorProfile = await dataStore.getOperatorProfile();
      const savedLeads: ClientRequestEntity[] = [];

      for (const lead of leads) {
        const pitches = await generatePitchVariants(lead, operatorProfile);
        lead.pitches = pitches;
        await dataStore.saveClientRequest(lead);
        await dataStore.recordRequestEvent({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          requestId: lead.id,
          eventType: 'created',
          notes: `Imported via CSV (${lead.sourcePlatform})`,
          createdAt: new Date().toISOString(),
        });
        savedLeads.push(lead);
      }

      return NextResponse.json({
        success: true,
        count: savedLeads.length,
        requests: savedLeads,
      });
    }

    if (action === 'create' && body.request) {
      const request: ClientRequestEntity = body.request;
      await dataStore.saveClientRequest(request);
      return NextResponse.json({
        success: true,
        request,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process client request' },
      { status: 500 }
    );
  }
}
