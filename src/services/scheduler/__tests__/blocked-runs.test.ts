import { describe, it, expect, beforeEach, vi } from 'vitest';
import { automationRunner } from '../automation-runner';
import { inMemoryDataStore as dataStore } from '../../repository/data-store';
import { NextRequest } from 'next/server';
import { GET as getScheduledRunRoute } from '@/app/api/cron/scheduled-run/route';

describe('Requirement 3: Blocked Runs & Skipped History Unit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    dataStore.resetToSeedData();
    dataStore.releaseLock('scheduler_global_run_lock');
    dataStore.setAutomationPaused(false);
    dataStore.setOperatingMode('approval');
    process.env.CRON_SECRET = 'valid_cron_secret';
  });

  it('records skipped run with clear reason when emergency stop is active', async () => {
    process.env.EMERGENCY_STOP = 'true';

    const result = await automationRunner.executeScheduledRun('test_emergency');

    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('Emergency stop is active');

    const lastRun = await dataStore.getLastSchedulerRun();
    expect(lastRun).toBeDefined();
    expect(lastRun.status).toBe('skipped');
    expect(lastRun.reason).toContain('Emergency stop is active');
  });

  it('records skipped run when Google Places key is missing in production', async () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.GOOGLE_PLACES_API_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyz.supabase.co';

    const result = await automationRunner.executeScheduledRun('test_places_missing');

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('Google Places key is missing');

    const lastRun = await dataStore.getLastSchedulerRun();
    expect(lastRun).toBeDefined();
    expect(lastRun.status).toBe('skipped');
    expect(lastRun.reason).toBe('Google Places key is missing');
  });

  it('records skipped run when Supabase database is not connected in production', async () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const result = await automationRunner.executeScheduledRun('test_no_db');

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('Supabase database is not connected in production mode.');

    const lastRun = await dataStore.getLastSchedulerRun();
    expect(lastRun).toBeDefined();
    expect(lastRun.status).toBe('skipped');
    expect(lastRun.reason).toBe('Supabase database is not connected in production mode.');
  });

  it('returns HTTP 200 with clear JSON reason when scheduled-run endpoint is triggered during a blocked run', async () => {
    process.env.EMERGENCY_STOP = 'true';

    const req = new NextRequest('http://localhost:3000/api/cron/scheduled-run', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer valid_cron_secret',
      },
    });

    const res = await getScheduledRunRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('skipped');
    expect(body.reason).toContain('Emergency stop is active');
  });
});
