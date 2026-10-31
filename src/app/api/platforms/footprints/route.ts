import { NextRequest, NextResponse } from 'next/server';
import { platformFootprintFinder } from '@/services/discovery/platform-footprint-finder';
import { dataStore } from '@/services/repository/data-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId required' }, { status: 400 });
    }

    const footprints = await dataStore.getFootprintsForBusiness(businessId);
    const spacingCheck = await platformFootprintFinder.verifyTouchSpacing(businessId);

    return NextResponse.json({
      success: true,
      businessId,
      footprints,
      spacingCheck,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, htmlContent } = body;
    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId required' }, { status: 400 });
    }

    const biz = (await dataStore.getBusinesses({ limit: 5000, includeDemo: true })).businesses.find(b => b.id === businessId);
    if (!biz) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const footprints = await platformFootprintFinder.discoverFootprints(biz, htmlContent);
    const spacingCheck = await platformFootprintFinder.verifyTouchSpacing(businessId);

    return NextResponse.json({
      success: true,
      businessId,
      footprints,
      spacingCheck,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

