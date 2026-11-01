import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { RequestStatus } from '@/types';
import { generatePitchVariants } from '@/services/client-requests/pitch-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const request = await dataStore.getClientRequestById(id);
    if (!request) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, request });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();

    if (body.status) {
      const validStatuses: RequestStatus[] = ['new', 'contacted', 'skipped', 'remind_later'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      await dataStore.updateClientRequestStatus(id, body.status);
    }

    if (body.pitchId && body.editedText !== undefined) {
      const request = await dataStore.getClientRequestById(id);
      const pitch = request?.pitches?.find(p => p.id === body.pitchId);
      if (pitch) {
        pitch.editedText = body.editedText;
        await dataStore.saveRequestPitch(pitch);
      }
    }

    const updated = await dataStore.getClientRequestById(id);
    return NextResponse.json({ success: true, request: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();
    const action = body.action;

    if (action === 'regenerate_pitch') {
      const request = await dataStore.getClientRequestById(id);
      if (!request) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }

      const operatorProfile = await dataStore.getOperatorProfile();
      const pitches = await generatePitchVariants(request, operatorProfile);
      for (const p of pitches) {
        await dataStore.saveRequestPitch(p);
      }
      const updated = await dataStore.getClientRequestById(id);
      return NextResponse.json({ success: true, request: updated });
    }

    if (action === 'record_event') {
      await dataStore.recordRequestEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestId: id,
        eventType: body.eventType || 'viewed',
        notes: body.notes || null,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
