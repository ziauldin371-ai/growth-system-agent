import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { jobQueue } from '@/services/queue/job-queue';
import { z } from 'zod';

const GenerateDraftSchema = z.object({
  businessId: z.string(),
  strategy: z.enum([
    'web_development',
    'ai_automation',
    'rag_systems',
    'python_engineering',
    'data_science',
    'agency_partner',
  ]),
  campaignId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;
  const campaignId = searchParams.get('campaignId') || undefined;

  const drafts = await dataStore.getDrafts({ status, campaignId });
  return NextResponse.json({
    success: true,
    total: drafts.length,
    drafts,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = GenerateDraftSchema.parse(body);

    const biz = await dataStore.getBusinessById(validated.businessId);
    if (!biz) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const job = await jobQueue.enqueue({
      jobType: 'generate_draft',
      payload: validated,
      priority: 5,
    });

    return NextResponse.json({
      success: true,
      message: 'Draft generation enqueued',
      jobId: job.id,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Invalid request',
    }, { status: 400 });
  }
}
