import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { PlatformEntity } from '@/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const pitchMode = searchParams.get('pitchMode') || undefined;
    const countryEligibility = searchParams.get('countryEligibility') || undefined;
    const myAccountStatus = searchParams.get('myAccountStatus') || undefined;
    const search = searchParams.get('search') || undefined;

    const platforms = await dataStore.getPlatforms({
      category,
      priority,
      pitchMode,
      countryEligibility,
      myAccountStatus,
      search,
    });

    return NextResponse.json({
      success: true,
      total: platforms.length,
      platforms,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.url || !body.category) {
      return NextResponse.json({ success: false, error: 'Name, URL, and category are required' }, { status: 400 });
    }

    const id = body.id || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `platform_${Date.now()}`;
    const platform: PlatformEntity = {
      id,
      name: body.name,
      category: body.category,
      url: body.url,
      officialTermsUrl: body.officialTermsUrl || `${body.url.replace(/\/+$/, '')}/terms`,
      howToGetClients: body.howToGetClients || 'Browse projects or apply directly',
      aiMlRelevance: body.aiMlRelevance || 'AI/ML software solutions',
      pitchMode: body.pitchMode || 'proposal',
      integrationMode: body.integrationMode || 'manual_link',
      priority: body.priority || 'Medium',
      costAccessNotes: body.costAccessNotes || 'Verify current terms before use',
      practicalNote: body.practicalNote || 'Added by operator via dashboard',
      countryEligibilityStatus: body.countryEligibilityStatus || 'needs_check',
      myAccountStatus: body.myAccountStatus || 'none',
      lastVerified: body.lastVerified || null,
      isActive: body.isActive !== false,
      notes: body.notes || 'Verify current terms before use',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dataStore.savePlatform(platform);
    return NextResponse.json({ success: true, platform });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, updates, verifiedAt } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Platform ID is required' }, { status: 400 });
    }

    if (action === 'verify_terms') {
      const updated = await dataStore.verifyPlatformTerms(id, verifiedAt);
      return NextResponse.json({ success: true, platform: updated });
    }

    const updated = await dataStore.updatePlatform(id, updates || {});
    return NextResponse.json({ success: true, platform: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

