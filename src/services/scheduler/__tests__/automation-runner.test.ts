import { describe, it, expect, beforeEach } from 'vitest';
import { automationRunner } from '../automation-runner';
import { dataStore } from '../../repository/data-store';
import { emailService } from '../../email/email-service';
import { discoveryService } from '../../discovery/discovery-service';

describe('AutomationRunner Scheduler & Lifecycle Unit Tests', () => {
  beforeEach(() => {
    dataStore.resetToSeedData();
    dataStore.releaseLock('scheduler_global_run_lock');
    dataStore.setAutomationPaused(false);
    dataStore.setOperatingMode('approval');
    emailService.mockProvider.clearLog();
  });

  it('successfully acquires lock and completes scheduled pipeline run in approval mode', async () => {
    const result = await automationRunner.executeScheduledRun('cron_test');

    expect(result.status).toBe('completed');
    expect(result.operatingMode).toBe('approval');
    expect(result.leadsDiscovered).toBeGreaterThan(0);
    expect(result.leadsQualified).toBeGreaterThan(0);
    expect(result.draftsGenerated).toBeGreaterThan(0);
    // In approval mode, emails are NOT sent automatically
    expect(result.emailsSent).toBe(0);

    // Verify telemetry was recorded
    const history = dataStore.getSchedulerRuns();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].runId).toBe(result.runId);
  });

  it('prevents overlapping runs when distributed lock is already held', async () => {
    // Manually hold lock
    const locked = dataStore.acquireLock('scheduler_global_run_lock', 60000);
    expect(locked).toBe(true);

    // Attempt run
    const result = await automationRunner.executeScheduledRun('overlapping_test');

    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('Another automation run is currently in progress');
    expect(result.leadsDiscovered).toBe(0);
    expect(result.draftsGenerated).toBe(0);

    // Release manual lock
    dataStore.releaseLock('scheduler_global_run_lock');
  });

  it('aborts execution when automation is globally paused by operator', async () => {
    dataStore.setAutomationPaused(true);

    const result = await automationRunner.executeScheduledRun('paused_test');

    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('globally paused');
    expect(result.leadsDiscovered).toBe(0);
    expect(result.draftsGenerated).toBe(0);
  });

  it('respects research mode by discovering and qualifying leads without generating drafts', async () => {
    dataStore.setOperatingMode('research');

    const result = await automationRunner.executeScheduledRun('research_test');

    expect(result.status).toBe('completed');
    expect(result.operatingMode).toBe('research');
    expect(result.leadsDiscovered).toBeGreaterThan(0);
    // In research mode, drafts and sends are suppressed
    expect(result.draftsGenerated).toBe(0);
    expect(result.emailsSent).toBe(0);
  });

  it('blocks sandbox leads from dispatching in auto_send mode and records them as blocked drafts', async () => {
    dataStore.setOperatingMode('auto_send');

    const result = await automationRunner.executeScheduledRun('auto_send_sandbox_test', 10);

    expect(result.status).toBe('completed');
    expect(result.operatingMode).toBe('auto_send');
    expect(result.leadsDiscovered).toBeGreaterThan(0);
    expect(result.draftsGenerated).toBeGreaterThan(0);
    // Sandbox leads are strictly blocked from automated dispatch by safeguard
    expect(result.emailsSent).toBe(0);

    const drafts = await dataStore.getDrafts();
    const blockedDrafts = drafts.filter(d => (d as any).deliveryStatus === 'blocked');
    expect(blockedDrafts.length).toBeGreaterThan(0);
    expect((blockedDrafts[0] as any).rejectionReason).toContain('Sandbox / DEMO lead');
  });

  it('dispatches emails in auto_send mode when a verified live-provider lead passes all safeguards', async () => {
    dataStore.setOperatingMode('auto_send');

    // Register a verified real-provider lead
    discoveryService.registerProvider({
      id: 'google_places',
      name: 'Google Places API',
      isConfigured: () => true,
      discover: async () => [
        {
          id: 'live_biz_99',
          name: 'Pinnacle Commercial Roofing Ltd',
          domain: 'pinnacle-roofing-uk.co.uk',
          country: 'UK',
          region: 'London',
          city: 'London',
          address: '45 Fleet Street, London EC4Y 1AA',
          phone: '+44 20 7946 0199',
          industry: 'Home & Commercial Services',
          companyType: 'Private Limited Company',
          pipelineType: 'website_opportunities',
          sourceProvider: 'google_places',
          isUsable: true,
          evidence: [
            {
              id: 'ev_live_01',
              businessId: 'live_biz_99',
              sourceName: 'Google Places API',
              sourceUrl: 'https://maps.google.com/?cid=998877',
              observationTime: new Date().toISOString(),
              evidenceType: 'profile_check',
              summary: 'Google Business profile has 4.8 stars from 150 reviews but lacks a website link.',
              isFactual: true,
              confidence: 0.95,
              freshnessScore: 1.0,
              createdAt: new Date().toISOString(),
            },
          ],
          contacts: [
            {
              fullName: 'George Vance',
              email: 'george.vance@pinnacle-roofing-uk.co.uk',
              verificationStatus: 'verified',
              isPrimary: true,
              confidence: 0.95,
            },
          ],
          socialUrls: ['https://linkedin.com/company/pinnacle-roofing'],
        },
      ],
    } as any);

    const result = await automationRunner.executeScheduledRun('auto_send_live_test', 14);

    expect(result.status).toBe('completed');
    expect(result.operatingMode).toBe('auto_send');
    expect(result.leadsDiscovered).toBeGreaterThan(0);
    expect(result.draftsGenerated).toBeGreaterThan(0);
    expect(result.emailsSent).toBeGreaterThanOrEqual(1);

    const logs = emailService.mockProvider.getSentLog();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[logs.length - 1].fromEmail).toContain('ziauldin371@gmail.com');
  });
});
