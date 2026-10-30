import { describe, it, expect } from 'vitest';
import { jobQueue } from '../job-queue';
import { inMemoryDataStore as dataStore } from '../../repository/data-store';

describe('Durable Job Queue & Worker Engine', () => {
  it('enqueues and executes a discovery crawl job with automated website verification and scoring', async () => {
    const job = await jobQueue.enqueue({
      jobType: 'discovery_crawl',
      payload: {
        market: 'US',
        targetPipeline: 'both',
        industry: 'HVAC',
        limit: 2,
        provider: 'b2b_mock',
      },
      idempotencyKey: 'test-discovery-job-001',
    });

    expect(job).toBeDefined();
    expect(job.status).toBe('pending');
    expect(job.idempotencyKey).toBe('test-discovery-job-001');

    // Wait a brief moment for worker tick
    await new Promise(resolve => setTimeout(resolve, 300));

    const updatedJob = dataStore.getJobs().find(j => j.id === job.id);
    expect(updatedJob?.status).toBe('completed');
    expect(updatedJob?.result?.leadsDiscovered).toBeGreaterThan(0);
  });

  it('prevents duplicate jobs with the same idempotency key', async () => {
    const key = 'test-idempotency-unique-key';
    const job1 = await jobQueue.enqueue({
      jobType: 'score_leads',
      payload: { businessId: 'biz-001-vanguard-hvac' },
      idempotencyKey: key,
    });

    const job2 = await jobQueue.enqueue({
      jobType: 'score_leads',
      payload: { businessId: 'biz-001-vanguard-hvac' },
      idempotencyKey: key,
    });

    expect(job1.id).toBe(job2.id);
  });
});
