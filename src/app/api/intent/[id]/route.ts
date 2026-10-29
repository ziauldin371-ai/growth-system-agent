import { NextRequest, NextResponse } from 'next/server';
import { intentRadarService } from '@/services/intent/intent-radar-service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updated = intentRadarService.updateOpportunityStatus(params.id, body.status);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      opportunity: intentRadarService.getOpportunityById(params.id),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update opportunity' },
      { status: 500 }
    );
  }
}

