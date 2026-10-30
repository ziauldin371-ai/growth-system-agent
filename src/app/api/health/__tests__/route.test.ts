import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { dataStore } from '@/services/repository/data-store';

describe('/api/health endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns healthy status when last run was within 14 hours', async () => {
    const recentRunTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    vi.spyOn(dataStore, 'getLastSchedulerRun').mockResolvedValue({
      runId: 'run_test_01',
      status: 'completed',
      finishTimeUtc: recentRunTime,
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.scheduler.status).toBe('active');
    expect(body.scheduler.isWithinThreshold).toBe(true);
    expect(body.scheduler.hoursSinceLastRun).toBeLessThanOrEqual(3);
    expect(body.scheduler.lastSuccessfulRunAt).toBe(recentRunTime);

    // Verify zero sensitive data is exposed
    expect(body.leads).toBeUndefined();
    expect(body.emails).toBeUndefined();
    expect(body.businesses).toBeUndefined();
  });

  it('returns degraded status with scheduler stopped when last run was older than 14 hours', async () => {
    const oldRunTime = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(); // 16 hours ago
    vi.spyOn(dataStore, 'getLastSchedulerRun').mockResolvedValue({
      runId: 'run_test_old',
      status: 'completed',
      finishTimeUtc: oldRunTime,
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.scheduler.status).toBe('stopped');
    expect(body.scheduler.isWithinThreshold).toBe(false);
    expect(body.scheduler.hoursSinceLastRun).toBeGreaterThan(14);
  });
});
