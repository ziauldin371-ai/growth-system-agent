import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { jobQueue } from '@/services/queue/job-queue';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database not connected: Supabase PostgreSQL is required in production before dispatching emails.',
      },
      { status: 503 }
    );
  }

  const campaign = await dataStore.getCampaignById(params.id);
  if (!campaign) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
  }

  // Find approved drafts associated with this campaign
  const approvedDrafts = await dataStore
    .getDrafts({ status: 'approved', campaignId: campaign.id });

  if (approvedDrafts.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No approved drafts ready for dispatch in this campaign. All emails require explicit administrator approval before sending.',
    }, { status: 400 });
  }

  const enqueuedJobIds: string[] = [];

  for (const draft of approvedDrafts) {
    const job = await jobQueue.enqueue({
      jobType: 'send_approved_email',
      payload: {
        draftId: draft.id,
        approvedBy: draft.approvedBy || 'admin',
      },
      priority: 20,
    });
    enqueuedJobIds.push(job.id);
  }

  campaign.status = 'running';
  await dataStore.saveCampaign(campaign);

  return NextResponse.json({
    success: true,
    message: `Dispatched ${enqueuedJobIds.length} approved emails to durable worker queue.`,
    enqueuedJobIds,
  });
}
