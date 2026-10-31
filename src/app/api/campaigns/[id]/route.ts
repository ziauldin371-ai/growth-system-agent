import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { z } from 'zod';

const UpdateCampaignSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled']).optional(),
  dailyCap: z.number().int().min(1).max(200).optional(),
  name: z.string().min(3).max(100).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = await dataStore.getCampaignById(params.id);
  if (!campaign) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    campaign,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await dataStore.getCampaignById(params.id);
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const body = await req.json();
    const validated = UpdateCampaignSchema.parse(body);

    if (validated.status) campaign.status = validated.status;
    if (validated.dailyCap) campaign.dailyCap = validated.dailyCap;
    if (validated.name) campaign.name = validated.name;
    campaign.updatedAt = new Date().toISOString();

    await dataStore.saveCampaign(campaign);

    return NextResponse.json({
      success: true,
      message: `Campaign updated successfully. Status: ${campaign.status}`,
      campaign,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Invalid update payload',
    }, { status: 400 });
  }
}

