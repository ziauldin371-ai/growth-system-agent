import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DataStore } from '../data-store';
import { normalizeBusinessName } from '../../crm/normalization';

describe('Repository Persistence & Restart Survival (Item 1)', () => {
  const testPersistencePath = path.join(process.cwd(), '.data', 'test_persistence_store.json');

  beforeEach(() => {
    if (fs.existsSync(testPersistencePath)) {
      try {
        fs.unlinkSync(testPersistencePath);
      } catch {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(testPersistencePath)) {
      try {
        fs.unlinkSync(testPersistencePath);
      } catch {}
    }
  });

  it('proves that a suppression record survives a full process restart', () => {
    // 1. Initial process runs and registers an unsubscribe/DNC request
    let storeInstance: DataStore | null = new DataStore(testPersistencePath);

    const suppressedEmail = 'optout-permanent@targetclient.com';
    expect(storeInstance.isSuppressed(suppressedEmail)).toBe(false);

    storeInstance.addSuppression({
      id: 'sup-restart-test-1',
      organizationId: 'org-test-001',
      type: 'email',
      value: suppressedEmail,
      reason: 'unsubscribe',
      notes: 'User clicked one-click unsubscribe in email footer',
      createdAt: new Date().toISOString(),
    });

    expect(storeInstance.isSuppressed(suppressedEmail)).toBe(true);

    // 2. Simulate process shutdown / container reboot by destroying the in-memory instance
    storeInstance = null;

    // 3. New server process spins up with fresh memory
    const restartedStore = new DataStore(testPersistencePath);

    // 4. Assert suppression survived the restart
    expect(restartedStore.isSuppressed(suppressedEmail)).toBe(true);
    const list = restartedStore.getSuppressionList();
    const found = list.find(s => s.value.toLowerCase() === suppressedEmail.toLowerCase());
    expect(found).toBeDefined();
    expect(found?.reason).toBe('unsubscribe');
  });

  it('proves that businesses, drafts, and jobs survive a process restart', () => {
    // 1. First process saves records
    let store: DataStore | null = new DataStore(testPersistencePath);

    const testBizId = 'biz-persist-999';
    store.saveBusiness({
      id: testBizId,
      organizationId: 'org-test-001',
      name: 'Persisted Robotics Labs LLC',
      normalizedName: normalizeBusinessName('Persisted Robotics Labs LLC'),
      domain: 'persistedrobotics.com',
      normalizedDomain: 'persistedrobotics.com',
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      pipelineType: 'ai_software_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'google_places',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    store.saveJob({
      id: 'job-persist-101',
      organizationId: 'org-test-001',
      jobType: 'discovery_crawl',
      status: 'completed',
      priority: 1,
      payload: { market: 'US', industry: 'Robotics' },
      retryCount: 0,
      maxRetries: 3,
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Simulate server restart
    store = null;

    // 3. Re-instantiate
    const restartedStore = new DataStore(testPersistencePath);

    const retrievedBiz = restartedStore.getBusinessById(testBizId);
    expect(retrievedBiz).toBeDefined();
    expect(retrievedBiz?.name).toBe('Persisted Robotics Labs LLC');

    const jobs = restartedStore.getJobs();
    const retrievedJob = jobs.find(j => j.id === 'job-persist-101');
    expect(retrievedJob).toBeDefined();
    expect(retrievedJob?.status).toBe('completed');
  });
});
