import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { generateSafeCsv } from '@/services/crm/normalization';
import { PipelineType } from '@/types';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const pipeline = (searchParams.get('pipeline') || 'all') as PipelineType | 'all';
  
  const { businesses } = dataStore.getBusinesses({ pipeline, limit: 1000 });

  const headers = [
    'Name',
    'Pipeline',
    'Status',
    'Domain',
    'Website Status',
    'Country',
    'City',
    'Industry',
    'Overall Score',
    'Contact Name',
    'Contact Email',
    'Reasoning',
  ];

  const rows = businesses.map(b => ({
    'Name': b.name,
    'Pipeline': b.pipelineType,
    'Status': b.qualificationStatus,
    'Domain': b.domain || 'N/A',
    'Website Status': b.websiteCheck?.status || 'N/A',
    'Country': b.country,
    'City': b.city || '',
    'Industry': b.industry || '',
    'Overall Score': b.score?.overallScore ?? 0,
    'Contact Name': b.contacts?.[0]?.fullName || '',
    'Contact Email': b.contacts?.[0]?.email || '',
    'Reasoning': b.score?.reasoning || '',
  }));

  const csvContent = generateSafeCsv(headers, rows);

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="growthsignal-leads-${pipeline}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
