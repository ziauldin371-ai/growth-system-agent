import { describe, it, expect, beforeEach } from 'vitest';
import { automationRunner } from '../automation-runner';
import { dataStore } from '../../repository/data-store';
import { emailService } from '../../email/email-service';

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

  it('generates, approves and executes dispatches in auto_send mode', async () => {
    dataStore.setOperatingMode('auto_send');

    const result = await automationRunner.executeScheduledRun('auto_send_test', 10);

    expect(result.status).toBe('completed');
    expect(result.operatingMode).toBe('auto_send');
    expect(result.leadsDiscovered).toBeGreaterThan(0);
    expect(result.draftsGenerated).toBeGreaterThan(0);
    // Dispatches attempted and logged via mock provider
    expect(result.emailsSent).toBeGreaterThanOrEqual(1);

    const logs = emailService.mockProvider.getSentLog();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].fromEmail).toContain('ziauldin371@gmail.com');
    expect(logs[0].fromName).toContain('Zia Ul Din');
  });
});
