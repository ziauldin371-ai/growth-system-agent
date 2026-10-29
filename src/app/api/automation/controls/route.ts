import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { automationRunner } from '@/services/scheduler/automation-runner';
import { z } from 'zod';

const ControlActionSchema = z.object({
  action: z.enum(['run_now', 'set_mode', 'pause', 'resume']),
  mode: z.enum(['research', 'approval', 'auto_send']).optional(),
});

export async function GET() {
  const stats = dataStore.getPlatformStats();
  const runs = dataStore.getSchedulerRuns();

  return NextResponse.json({
    success: true,
    operatingMode: dataStore.getOperatingMode(),
    automationPaused: dataStore.isAutomationPaused(),
    lastSchedulerRun: dataStore.getLastSchedulerRun(),
    recentRuns: runs.slice(0, 10),
    scheduleConfig: {
      pkTime: '09:00 & 17:00 (Asia/Karachi, PKT)',
      utcTime: '04:00 & 12:00 (UTC)',
      cronExpression: '0 4,12 * * *',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, mode } = ControlActionSchema.parse(body);

    if (action === 'set_mode' && mode) {
      dataStore.setOperatingMode(mode);
      return NextResponse.json({
        success: true,
        message: `Operating mode updated to "${mode}"`,
        operatingMode: mode,
      });
    }

    if (action === 'pause') {
      dataStore.setAutomationPaused(true);
      return NextResponse.json({
        success: true,
        message: 'Automation execution paused globally',
        automationPaused: true,
      });
    }

    if (action === 'resume') {
      dataStore.setAutomationPaused(false);
      return NextResponse.json({
        success: true,
        message: 'Automation execution resumed',
        automationPaused: false,
      });
    }

    if (action === 'run_now') {
      const result = await automationRunner.executeScheduledRun('manual_dashboard');
      return NextResponse.json({
        success: true,
        message: 'Manual automation run executed',
        result,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Control operation failed',
    }, { status: 400 });
  }
}

