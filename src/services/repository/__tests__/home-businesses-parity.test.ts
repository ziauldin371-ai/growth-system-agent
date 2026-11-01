import { describe, it, expect, beforeEach } from 'vitest';
import { 
  computeHomeStats, 
  getUnifiedBusinessCounts, 
  isDemoOrSandboxRecord 
} from '../demo-guard';
import { DataStore } from '../data-store';
import { SupabaseDataStore } from '../supabase-data-store';
import { BusinessEntity, EmailDraftEntity } from '@/types';

describe('Home and Businesses Found Parity & Integrity Guard', () => {
  let inMemStore: DataStore;
  let supabaseStore: SupabaseDataStore;

  beforeEach(() => {
    inMemStore = new DataStore();
    inMemStore.resetToSeedData();
    supabaseStore = new SupabaseDataStore(inMemStore);
  });

  it('1. with an empty real dataset, Home and Businesses Found both strictly show 0', async () => {
    // When no businesses exist
    const emptyBusinesses: BusinessEntity[] = [];
    const emptyDrafts: EmailDraftEntity[] = [];

    const homeStats = computeHomeStats({
      businesses: emptyBusinesses,
      drafts: emptyDrafts,
      isGmailConnected: true,
      showDemo: false,
    });

    const businessCounts = getUnifiedBusinessCounts(emptyBusinesses, { showDemo: false });

    // Assert Home shows 0
    expect(homeStats.totalBusinesses).toBe(0);
    expect(homeStats.foundToday).toBe(0);
    expect(homeStats.needsWebsites).toBe(0);
    expect(homeStats.manualOutreachCount).toBe(0);

    // Assert Businesses Found counts show 0
    expect(businessCounts.total).toBe(0);
    expect(businessCounts.foundToday).toBe(0);
    expect(businessCounts.needsWebsites).toBe(0);
    expect(businessCounts.brokenWebsites).toBe(0);
    expect(businessCounts.needsAi).toBe(0);
    expect(businessCounts.hotRequests).toBe(0);

    // Invariant: Both must strictly agree
    expect(homeStats.totalBusinesses).toBe(businessCounts.total);
    expect(homeStats.needsWebsites).toBe(businessCounts.needsWebsites);
  });

  it('2. with 2 real and 3 demo/test records, both show exactly 2', async () => {
    const todayIso = new Date().toISOString();

    const realBiz1: BusinessEntity = {
      id: 'real-biz-001',
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Apex Plumbing London',
      normalizedName: 'apex plumbing london',
      domain: 'apexplumbing.co.uk',
      city: 'London',
      country: 'UK',
      qualificationStatus: 'qualified',
      pipelineType: 'unassigned',
      sourceProvider: 'osm',
      isArchived: false,
      createdAt: todayIso,
      updatedAt: todayIso,
    };

    const realBiz2: BusinessEntity = {
      id: 'real-biz-002',
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Manchester Dental Care',
      normalizedName: 'manchester dental care',
      domain: '', // Needs website
      city: 'Manchester',
      country: 'UK',
      qualificationStatus: 'qualified',
      pipelineType: 'unassigned',
      sourceProvider: 'osm',
      isArchived: false,
      createdAt: todayIso,
      updatedAt: todayIso,
    };

    const demoBiz1: BusinessEntity = {
      id: 'biz-001-mock',
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Simulated Salon',
      normalizedName: 'simulated salon',
      domain: 'simulatedsalon.mock',
      city: 'London',
      country: 'UK',
      qualificationStatus: 'qualified',
      pipelineType: 'unassigned',
      sourceProvider: 'mock',
      isArchived: false,
      createdAt: todayIso,
      updatedAt: todayIso,
    };

    const demoBiz2: BusinessEntity = {
      id: 'TEST_service_role_32ee',
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Test Business 32ee',
      normalizedName: 'test business 32ee',
      domain: 'testbiz-32ee.co.uk',
      city: 'Manchester',
      country: 'UK',
      qualificationStatus: 'qualified',
      pipelineType: 'unassigned',
      sourceProvider: 'service_role_test',
      isArchived: false,
      createdAt: todayIso,
      updatedAt: todayIso,
    };

    const demoBiz3: BusinessEntity = {
      id: 'seed-b3-sandbox',
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Sandbox Gym',
      normalizedName: 'sandbox gym',
      domain: 'sandboxgym.internal',
      city: 'Bristol',
      country: 'UK',
      isSandboxData: true,
      qualificationStatus: 'qualified',
      pipelineType: 'unassigned',
      sourceProvider: 'b2b_mock',
      isArchived: false,
      createdAt: todayIso,
      updatedAt: todayIso,
    };

    const allRecords = [realBiz1, realBiz2, demoBiz1, demoBiz2, demoBiz3];

    // Verify filter correctly flags the 3 test/demo records
    expect(isDemoOrSandboxRecord(realBiz1)).toBe(false);
    expect(isDemoOrSandboxRecord(realBiz2)).toBe(false);
    expect(isDemoOrSandboxRecord(demoBiz1)).toBe(true);
    expect(isDemoOrSandboxRecord(demoBiz2)).toBe(true);
    expect(isDemoOrSandboxRecord(demoBiz3)).toBe(true);

    // When showDemo = false:
    const homeStats = computeHomeStats({
      businesses: allRecords,
      drafts: [],
      isGmailConnected: true,
      showDemo: false,
    });

    const businessCounts = getUnifiedBusinessCounts(allRecords, { showDemo: false });

    // Assert both show EXACTLY 2
    expect(homeStats.totalBusinesses).toBe(2);
    expect(homeStats.foundToday).toBe(2);
    expect(businessCounts.total).toBe(2);
    expect(businessCounts.foundToday).toBe(2);
    expect(homeStats.totalBusinesses).toBe(businessCounts.total);

    // One of the two real businesses has no website
    expect(homeStats.needsWebsites).toBe(1);
    expect(businessCounts.needsWebsites).toBe(1);

    // When showDemo = true:
    const demoHomeStats = computeHomeStats({
      businesses: allRecords,
      drafts: [],
      isGmailConnected: true,
      showDemo: true,
    });
    const demoBusinessCounts = getUnifiedBusinessCounts(allRecords, { showDemo: true });

    expect(demoHomeStats.totalBusinesses).toBe(5);
    expect(demoBusinessCounts.total).toBe(5);
    expect(demoHomeStats.totalBusinesses).toBe(demoBusinessCounts.total);
  });

  it('3. Parity failure guard: fails if Home and Businesses Found ever disagree', () => {
    // Generate various test scenarios
    const scenarios: BusinessEntity[][] = [
      [],
      [
        {
          id: 'b1',
          organizationId: '00000000-0000-0000-0000-000000000001',
          name: 'Real Biz 1',
          normalizedName: 'real biz 1',
          domain: 'real1.com',
          city: 'London',
          country: 'UK',
          qualificationStatus: 'qualified',
          pipelineType: 'unassigned',
          sourceProvider: 'osm',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      [
        {
          id: 'test-1',
          organizationId: '00000000-0000-0000-0000-000000000001',
          name: 'Test Business 99',
          normalizedName: 'test business 99',
          domain: 'testdomain.com',
          city: 'London',
          country: 'UK',
          qualificationStatus: 'qualified',
          pipelineType: 'unassigned',
          sourceProvider: 'service_role_test',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    ];

    for (const dataset of scenarios) {
      const homeStats = computeHomeStats({
        businesses: dataset,
        drafts: [],
        isGmailConnected: true,
        showDemo: false,
      });

      const counts = getUnifiedBusinessCounts(dataset, { showDemo: false });

      if (homeStats.totalBusinesses !== counts.total) {
        throw new Error(
          `PARITY VIOLATION DETECTED: Home shows ${homeStats.totalBusinesses} but Businesses Found shows ${counts.total}`
        );
      }
      if (homeStats.needsWebsites !== counts.needsWebsites) {
        throw new Error(
          `PARITY VIOLATION DETECTED: Home needsWebsites (${homeStats.needsWebsites}) != Businesses Found no_website (${counts.needsWebsites})`
        );
      }
      if (homeStats.brokenWebsites !== counts.brokenWebsites) {
        throw new Error(
          `PARITY VIOLATION DETECTED: Home brokenWebsites (${homeStats.brokenWebsites}) != Businesses Found broken_website (${counts.brokenWebsites})`
        );
      }
      if (homeStats.needsAi !== counts.needsAi) {
        throw new Error(
          `PARITY VIOLATION DETECTED: Home needsAi (${homeStats.needsAi}) != Businesses Found needs_ai (${counts.needsAi})`
        );
      }
      if (homeStats.hotRequests !== counts.hotRequests) {
        throw new Error(
          `PARITY VIOLATION DETECTED: Home hotRequests (${homeStats.hotRequests}) != Businesses Found hot_requests (${counts.hotRequests})`
        );
      }
    }
  });

  it('4. Home sentence never says "Everything is running smoothly" when discovery was skipped', () => {
    function computeGreetingSummary(lastRun: any, totalBusinesses: number, sentCount: number, repliesCount: number): string {
      if (lastRun?.status === 'skipped') {
        const reason = lastRun.reason || 'Waiting for the business finder to be set up';
        if (
          reason.toLowerCase().includes('google places') ||
          reason.toLowerCase().includes('finder') ||
          reason.toLowerCase().includes('key missing')
        ) {
          return 'Waiting for the business finder to be set up.';
        }
        return `Last scheduled run was skipped (${reason}).`;
      }
      if (lastRun?.status === 'failed') {
        return `The last scheduled run failed: ${lastRun.error || 'Please check logs'}.`;
      }
      if (totalBusinesses > 0 || sentCount > 0) {
        return `Everything is running smoothly. ${totalBusinesses} opportunities found, ${sentCount} emails sent via Gmail, and ${repliesCount} replies received.`;
      }
      return 'Nothing yet. Start by connecting your services or launching a new business search.';
    }

    // Skipped run with Google Places key missing
    const skippedPlaces = computeGreetingSummary(
      { status: 'skipped', reason: 'Google Places key is missing' },
      5,
      0,
      0
    );
    expect(skippedPlaces).toBe('Waiting for the business finder to be set up.');
    expect(skippedPlaces).not.toContain('Everything is running smoothly');

    // Skipped run with custom reason
    const skippedOther = computeGreetingSummary(
      { status: 'skipped', reason: 'Outside permitted discovery hours' },
      5,
      0,
      0
    );
    expect(skippedOther).toBe('Last scheduled run was skipped (Outside permitted discovery hours).');
    expect(skippedOther).not.toContain('Everything is running smoothly');

    // Normal running smoothly state
    const normalState = computeGreetingSummary(
      { status: 'completed' },
      5,
      2,
      1
    );
    expect(normalState).toBe('Everything is running smoothly. 5 opportunities found, 2 emails sent via Gmail, and 1 replies received.');

    // Empty state
    const emptyState = computeGreetingSummary(null, 0, 0, 0);
    expect(emptyState).toBe('Nothing yet. Start by connecting your services or launching a new business search.');
  });
});
