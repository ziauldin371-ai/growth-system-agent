import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { CreateCampaignSchema } from '@/lib/validation/schemas';
import crypto from 'crypto';

export async function GET() {
  const campaigns = await dataStore.getCampaigns();
  return NextResponse.json({
    success: true,
    campaigns,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateCampaignSchema.parse(body);

    const newCampaign = {
      id: `camp_${crypto.randomBytes(6).toString('hex')}`,
      organizationId: 'org_growth_system_main',
      ...validated,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        totalLeads: 0,
        approvedLeads: 0,
        sentCount: 0,
        deliveredCount: 0,
        repliedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
      },
    };

    await dataStore.saveCampaign(newCampaign);

    return NextResponse.json({
      success: true,
      message: 'Campaign created in draft mode',
      campaign: newCampaign,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Invalid campaign parameters' }, { status: 400 });
  }
}
