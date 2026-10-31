import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { z } from 'zod';

const ApproveSchema = z.object({
  draftId: z.string(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId, action } = ApproveSchema.parse(body);

    const targetStatus = action === 'approve' ? 'approved' : 'rejected';
    const updated = await dataStore.updateDraftStatus(draftId, targetStatus, 'admin@growthsignal.ai');

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Draft marked as ${targetStatus}`,
      draft: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Invalid request' }, { status: 400 });
  }
}
