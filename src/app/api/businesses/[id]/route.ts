import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const business = dataStore.getBusinessById(params.id);
  if (!business) {
    return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
  }

  const drafts = dataStore.getDrafts().filter(d => d.businessId === business.id);

  return NextResponse.json({
    success: true,
    business: {
      ...business,
      drafts,
    },
  });
}
