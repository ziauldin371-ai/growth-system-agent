import { NextRequest, NextResponse } from 'next/server';
import { leadSourceRegistry } from '@/services/discovery/adapters/lead-source-registry';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get('all') === 'true';

    const csvData = await leadSourceRegistry.generateExternalSendingToolCsv({
      includeUnapproved: includeAll,
    });

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="growth_system_approved_outreach_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
