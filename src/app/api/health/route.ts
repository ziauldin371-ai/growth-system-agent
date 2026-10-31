import { NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  let dbStatus = 'unconfigured';
  let isDbConnected = false;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase.from('scheduler_run_history').select('id').limit(1);
      if (!error) {
        dbStatus = 'connected';
        isDbConnected = true;
      } else {
        dbStatus = `error: ${error.message}`;
      }
    } catch (err: any) {
      dbStatus = `unreachable: ${err?.message || 'unknown'}`;
    }
  } else {
    dbStatus = process.env.NODE_ENV === 'production' ? 'missing_supabase_in_production' : 'local_storage';
  }

  // Get last recorded scheduler run from store
  const lastRun = await dataStore.getLastSchedulerRun();

  let hoursSinceLastRun: number | null = null;
  let schedulerStatus: 'active' | 'stopped' | 'no_runs_recorded' = 'no_runs_recorded';
  let isSchedulerHealthy = true;

  if (lastRun && (lastRun.finishTimeUtc || lastRun.startTimeUtc)) {
    const lastRunTimestamp = new Date(lastRun.finishTimeUtc || lastRun.startTimeUtc).getTime();
    hoursSinceLastRun = Number(((now.getTime() - lastRunTimestamp) / (1000 * 60 * 60)).toFixed(2));

    if (hoursSinceLastRun > 14) {
      schedulerStatus = 'stopped';
      isSchedulerHealthy = false;
    } else {
      schedulerStatus = 'active';
      isSchedulerHealthy = true;
    }
  }

  const overallStatus = isSchedulerHealthy ? 'healthy' : 'degraded';

  const responseBody = {
    status: overallStatus,
    readiness: overallStatus === 'healthy' && isDbConnected ? 'ok' : 'not ready',
    timestampUtc: now.toISOString(),
    database: isDbConnected ? 'connected' : dbStatus,
    databaseDetails: {
      mode: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'supabase_postgresql' : 'local_file',
      status: dbStatus,
      connected: isDbConnected,
    },
    scheduler: {
      status: schedulerStatus,
      lastSuccessfulRunAt: lastRun?.finishTimeUtc || lastRun?.startTimeUtc || null,
      hoursSinceLastRun,
      thresholdHours: 14,
      isWithinThreshold: hoursSinceLastRun !== null ? hoursSinceLastRun <= 14 : true,
      nextScheduledRuns: {
        cron: '0 4,12 * * *',
        description: '09:00 and 17:00 Asia/Karachi (04:00 and 12:00 UTC)',
      },
    },
    system: {
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    },
  };

  return NextResponse.json(responseBody, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
