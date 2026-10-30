import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { UpdateAlternativeChannelSchema } from '@/lib/validation/schemas';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const channelId = params.id;
    const body = await req.json();

    if (body.action === 'mark_contacted') {
      await dataStore.recordChannelContact(channelId);
      const ch = await dataStore.getAlternativeChannelById(channelId);
      return NextResponse.json({
        success: true,
        message: 'Channel marked as contacted; 3-day multi-channel quiet period scheduled.',
        channel: ch,
      });
    }

    if (body.action === 'lock_opt_out') {
      const ch = await dataStore.getAlternativeChannelById(channelId);
      if (ch) {
        await dataStore.lockAllChannelsForBusiness(ch.businessId, body.reason || 'Lead requested opt-out on alternative channel');
      }
      return NextResponse.json({
        success: true,
        message: 'All outreach channels locked for this business and added to global suppression list.',
      });
    }

    const parsed = UpdateAlternativeChannelSchema.safeParse({
      channelId,
      ...body,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await dataStore.updateAlternativeChannelStatus(
      channelId,
      parsed.data.status,
      parsed.data.reminderDate,
      parsed.data.notes,
      parsed.data.customPitch
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Channel "${channelId}" not found` },
        { status: 404 }
      );
    }

    const record = await dataStore.getAlternativeChannelById(channelId);

    return NextResponse.json({
      success: true,
      message: 'Channel status updated successfully',
      channel: record,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update channel' },
      { status: 500 }
    );
  }
}

