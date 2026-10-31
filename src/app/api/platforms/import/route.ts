import { NextRequest, NextResponse } from 'next/server';
import { csvLeadImporter } from '@/services/discovery/adapters/csv-lead-importer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, csvContent, mapping, rawText, sourcePlatform } = body;

    if (mode === 'csv') {
      if (!csvContent || !mapping) {
        return NextResponse.json({ success: false, error: 'csvContent and column mapping required' }, { status: 400 });
      }
      const res = await csvLeadImporter.importFromCsv(csvContent, mapping, sourcePlatform || 'csv_import');
      return NextResponse.json({ success: true, result: res });
    }

    if (mode === 'paste') {
      if (!rawText) {
        return NextResponse.json({ success: false, error: 'rawText is required' }, { status: 400 });
      }
      const res = await csvLeadImporter.importFromPastedText(rawText, sourcePlatform || 'paste_importer');
      return NextResponse.json({ success: true, result: res });
    }

    return NextResponse.json({ success: false, error: 'mode must be csv or paste' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

