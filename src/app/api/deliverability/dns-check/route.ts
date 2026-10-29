import { NextRequest, NextResponse } from 'next/server';
import { checkDomainHealth } from '@/services/email/domain-health';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const domain = body.domain || 'gmail.com';

    const health = await checkDomainHealth(domain);

    return NextResponse.json({
      success: true,
      health,
      guide: {
        recommendedProvider: 'Google Workspace with custom branded domain',
        spfTemplate: `v=spf1 include:_spf.google.com ~all`,
        dmarcTemplate: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}; pct=100; sp=none; aspf=r;`,
        dkimGuidance: 'Configure 2048-bit DKIM key inside Google Admin Console',
        bounceThresholdNote: 'Auto-throttle activates if bounce rate exceeds 3.0%',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'DNS health check failed.' },
      { status: 500 }
    );
  }
}
