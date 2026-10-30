import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { jobQueue } from '@/services/queue/job-queue';

export async function GET() {
  const jobs = await dataStore.getJobs();
  return NextResponse.json({
    success: true,
    total: jobs.length,
    jobs,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not connected: Supabase PostgreSQL is required in production before starting jobs or discovery.',
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { jobType, payload, priority } = body;

    const job = await jobQueue.enqueue({
      jobType,
      payload: payload || {},
      priority: priority || 0,
    });

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to enqueue job' }, { status: 400 });
  }
}
