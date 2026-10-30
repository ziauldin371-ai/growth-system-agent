import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { PipelineType } from '@/types';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const pipeline = (searchParams.get('pipeline') || 'all') as PipelineType | 'all';
  const search = searchParams.get('search') || undefined;
  const qualificationStatus = searchParams.get('status') || undefined;
  const country = searchParams.get('country') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
  const includeDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const result = await dataStore.getBusinesses({
    pipeline,
    search,
    qualificationStatus,
    country,
    limit,
    offset,
    includeDemo,
  });

  return NextResponse.json({
    success: true,
    total: result.total,
    businesses: result.businesses,
  });
}
