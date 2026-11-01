import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await dataStore.getOperatorProfile();
    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await dataStore.saveOperatorProfile({
      name: body.name,
      headline: body.headline,
      services: body.services,
      portfolioLinks: Array.isArray(body.portfolioLinks) ? body.portfolioLinks : undefined,
      bio: body.bio,
      yearsOfExperience: body.yearsOfExperience,
      rateRange: body.rateRange,
      availability: body.availability,
      languages: body.languages,
      timezone: body.timezone,
    });
    return NextResponse.json({ success: true, profile: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
