import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const country = searchParams.get('country') || undefined;
    const pipeline = searchParams.get('pipeline') || undefined;
    const status = searchParams.get('status') || undefined;
    const industry = searchParams.get('industry') || undefined;
    const search = searchParams.get('search') || undefined;
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : undefined;
    const hasEmailParam = searchParams.get('hasEmail');
    const hasEmail = hasEmailParam !== null ? hasEmailParam === 'true' : undefined;
    const includeDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

    const leads = await dataStore.getWorldwideLeads({
      country,
      pipeline,
      status,
      industry,
      search,
      minScore,
      hasEmail,
      includeDemo,
    });

    return NextResponse.json({
      success: true,
      total: leads.length,
      leads,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
