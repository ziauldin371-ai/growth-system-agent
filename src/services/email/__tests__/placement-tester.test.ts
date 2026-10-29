import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlacementTester } from '../placement-tester';

describe('PlacementTester (No Simulation Rule)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.SEED_INBOXES;
    delete process.env.SEED_INBOX_GMAIL;
    delete process.env.SEED_INBOX_OUTLOOK;
    delete process.env.SEED_INBOX_YAHOO;
    delete process.env.SEED_INBOX_WORKSPACE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns "not_measured" with null rates when no seed inboxes are configured (no simulation)', async () => {
    const tester = new PlacementTester();
    const result = await tester.executePlacementTest({
      templateName: 'Website Audit v1',
      testSubject: 'Modern web architecture for your business',
    });

    expect(result.overallResult).toBe('not_measured');
    expect(result.primaryRate).toBeNull();
    expect(result.spamRate).toBeNull();
    expect(result.testResults).toHaveLength(0);
    expect(result.notes).toContain('Simulated metrics have been permanently disabled');
  });

  it('parses configured seed inboxes from SEED_INBOXES env correctly', () => {
    process.env.SEED_INBOXES = 'seed1@gmail.com,seed2@outlook.com,seed3@yahoo.com';
    const tester = new PlacementTester();
    const seeds = tester.getConfiguredSeedInboxes();

    expect(seeds).toHaveLength(3);
    expect(seeds[0]).toEqual({ provider: 'Gmail', email: 'seed1@gmail.com' });
    expect(seeds[1]).toEqual({ provider: 'Outlook', email: 'seed2@outlook.com' });
    expect(seeds[2]).toEqual({ provider: 'Yahoo', email: 'seed3@yahoo.com' });
  });
});
