import { NextRequest, NextResponse } from 'next/server';
import { discoveryService } from '@/services/discovery/discovery-service';
import { jobQueue } from '@/services/queue/job-queue';
import { DiscoveryRequestSchema } from '@/lib/validation/schemas';

export async function GET() {
  const providers = discoveryService.getProviders();
  return NextResponse.json({
    success: true,
    providers,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = DiscoveryRequestSchema.parse(body);

    // Enqueue as background durable job so it doesn't block HTTP timeout
    const job = await jobQueue.enqueue({
      jobType: 'discovery_crawl',
      payload: validated,
      priority: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'Discovery crawl enqueued successfully',
      jobId: job.id,
      status: job.status,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Invalid discovery parameters',
    }, { status: 400 });
  }
}
