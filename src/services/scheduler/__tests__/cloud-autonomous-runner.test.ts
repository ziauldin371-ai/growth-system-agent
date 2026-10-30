import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/cron/scheduled-run/route';
import { GET as getHealth } from '@/app/api/health/route';
import { dataStore } from '@/services/repository/data-store';
import { automationRunner } from '../automation-runner';

describe('Autonomous Cloud Scheduled Runner & Resumption Engine (Requirement 1-5)', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = 'test_cloud_cron_secret_7788';
    process.env.APP_BASE_URL = 'https://growth-system-agent.vercel.app';
    await dataStore.releaseLock('scheduler_global_run_lock');
  });

  afterEach(async () => {
    process.env = originalEnv;
    await dataStore.releaseLock('scheduler_global_run_lock');
  });

  it('successfully executes scheduled run via POST /api/cron/scheduled-run with Bearer secret', async () => {
    const req = new NextRequest('https://growth-system-agent.vercel.app/api/cron/scheduled-run', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_cloud_cron_secret_7788',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ triggeredBy: 'github_actions' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.status).toBe('completed');
    expect(body.result.runId).toBeDefined();

    // Verify row was recorded in scheduler_run_history
    const lastRun = await dataStore.getLastSchedulerRun();
    expect(lastRun).not.toBeNull();
    expect(lastRun.status).toBe('completed');
    expect(lastRun.runId).toBe(body.result.runId);

    // Verify checkpoint was updated
    const checkpoint = await dataStore.getCheckpoint('discovery_pipeline');
    expect(checkpoint).not.toBeNull();
    expect(checkpoint.cursorData).toBeDefined();

    // Verify /api/health reports active status
    const healthRes = await getHealth();
    expect(healthRes.status).toBe(200);
    const health = await healthRes.json();
    expect(health.status).toBe('healthy');
    expect(health.scheduler.status).toBe('active');
    expect(health.scheduler.hoursSinceLastRun).toBeLessThanOrEqual(0.1);
  });

  it('demonstrates bounded batch resumption across consecutive scheduled runs', async () => {
    // Reset checkpoint to known initial state
    await dataStore.saveCheckpoint('discovery_pipeline', { marketIndex: 0, industryIndex: 0, offset: 0 });

    // Run 1
    const run1 = await automationRunner.executeScheduledRun('github_actions_run_1');
    expect(run1.status).toBe('completed');
    const checkpoint1 = await dataStore.getCheckpoint('discovery_pipeline');
    expect(checkpoint1).not.toBeNull();
    expect(checkpoint1.cursorData.offset).toBe(10);

    // Run 2: picks up checkpoint and advances
    const run2 = await automationRunner.executeScheduledRun('github_actions_run_2');
    expect(run2.status).toBe('completed');
    const checkpoint2 = await dataStore.getCheckpoint('discovery_pipeline');
    expect(checkpoint2).not.toBeNull();
    expect(checkpoint2.cursorData.offset).toBe(20);
  });

  it('prevents overlapping runs using distributed lock', async () => {
    // Manually hold lock
    await dataStore.acquireLock('scheduler_global_run_lock', 600000);

    // Attempt second run while lock is held
    const concurrentRun = await automationRunner.executeScheduledRun('overlapping_github_action');
    expect(concurrentRun.status).toBe('skipped');
    expect(concurrentRun.reason?.toLowerCase()).toContain('overlapping');

    // Clean up
    await dataStore.releaseLock('scheduler_global_run_lock');
  });
});
