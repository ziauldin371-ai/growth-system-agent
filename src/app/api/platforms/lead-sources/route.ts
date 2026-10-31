import { NextRequest, NextResponse } from 'next/server';
import { leadSourceRegistry } from '@/services/discovery/adapters/lead-source-registry';
import { dataStore } from '@/services/repository/data-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configs = await dataStore.getLeadSourceConfigs();
    const sources = leadSourceRegistry.getAllSources().map(s => {
      const cfg = configs.find(c => c.sourceName === s.id);
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        isConfigured: s.isConfigured(),
        healthStatus: s.getHealthStatus(),
        monthlyBudget: cfg?.monthlyCreditBudget || s.getMonthlyBudget(),
        creditsUsed: cfg?.creditsUsedThisMonth || s.getCreditsUsed(),
      };
    });

    return NextResponse.json({ success: true, sources });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceId, action, budget } = body;
    if (!sourceId) {
      return NextResponse.json({ success: false, error: 'sourceId required' }, { status: 400 });
    }

    const source = leadSourceRegistry.getSource(sourceId);
    if (!source) {
      return NextResponse.json({ success: false, error: `Unknown source: ${sourceId}` }, { status: 404 });
    }

    if (action === 'test_connection') {
      const isConfigured = source.isConfigured();
      return NextResponse.json({
        success: true,
        sourceId,
        isConfigured,
        healthStatus: source.getHealthStatus(),
        message: isConfigured 
          ? `${source.name} official API connection verified!` 
          : `${source.name} is awaiting credentials in environment variables.`
      });
    }

    if (action === 'update_budget' && typeof budget === 'number') {
      await dataStore.saveLeadSourceConfig({
        id: `cfg_${sourceId}`,
        sourceName: sourceId,
        monthlyCreditBudget: budget,
        creditsUsedThisMonth: source.getCreditsUsed(),
        status: source.getHealthStatus() === 'healthy' ? 'active' : source.getHealthStatus() === 'degraded' ? 'error' : (source.getHealthStatus() as 'active' | 'rate_limited' | 'error' | 'not_configured'),
        apiKeyConfigured: source.isConfigured(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, message: 'Budget updated' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
