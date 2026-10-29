import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { SuppressionInputSchema } from '@/lib/validation/schemas';
import crypto from 'crypto';

export async function GET() {
  const list = dataStore.getSuppressionList();
  return NextResponse.json({
    success: true,
    total: list.length,
    suppressionList: list,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = SuppressionInputSchema.parse(body);

    const entry = {
      id: `sup_${crypto.randomBytes(6).toString('hex')}`,
      organizationId: 'org-demo-001',
      ...validated,
      createdAt: new Date().toISOString(),
    };

    dataStore.addSuppression(entry);

    return NextResponse.json({
      success: true,
      message: `Added ${validated.value} to suppression list`,
      entry,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Invalid suppression entry' }, { status: 400 });
  }
}
