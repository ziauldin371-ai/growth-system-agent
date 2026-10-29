import { NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { businesses } = dataStore.getBusinesses({ limit: 50 });
    
    // Sort newest-first (by fetchedAt or createdAt)
    const feed = businesses
      .map(b => ({
        id: b.id,
        name: b.name,
        country: b.country,
        city: b.city,
        industry: b.industry,
        sourceProvider: b.sourceProvider,
        sourceIdentifier: b.sourceIdentifier,
        fetchedAt: b.fetchedAt || b.createdAt,
        pipelineType: b.pipelineType,
        qualificationStatus: b.qualificationStatus,
        heatScore: b.heatScore || 75,
        isPermanentlyClosed: Boolean(b.isPermanentlyClosed),
        evidenceCount: b.evidence?.length || 0,
        hasEmail: Boolean(b.contacts && b.contacts.some(c => Boolean(c.email))),
        channelsCount: b.alternativeChannels?.length || 0,
      }))
      .sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime());

    return NextResponse.json({
      success: true,
      count: feed.length,
      feed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch discovery feed.' },
      { status: 500 }
    );
  }
}
