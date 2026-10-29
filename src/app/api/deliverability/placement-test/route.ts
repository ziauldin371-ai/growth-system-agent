import { NextRequest, NextResponse } from 'next/server';
import { placementTester } from '@/services/email/placement-tester';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('growth_agent_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const configuredSeeds = placementTester.getConfiguredSeedInboxes();

  return NextResponse.json({
    success: true,
    configuredSeedsCount: configuredSeeds.length,
    configuredSeeds,
    status: configuredSeeds.length > 0 ? 'ready' : 'not_configured',
    message: configuredSeeds.length > 0 
      ? 'Seed inboxes configured for real probe dispatch.' 
      : 'Not measured: No seed inboxes configured in environment (set SEED_INBOXES). Simulated results are disabled.',
  });
}

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('growth_agent_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { templateName = 'Default Outreach', testSubject = 'Quick question regarding AI automation', testAddresses } = body;

    const result = await placementTester.executePlacementTest({
      templateName,
      testSubject,
      testAddresses,
    });

    return NextResponse.json({
      success: true,
      placementTest: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Placement test execution failed' },
      { status: 500 }
    );
  }
}

