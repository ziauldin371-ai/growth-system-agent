import { describe, it, expect, beforeEach } from 'vitest';
import { runNotifierService } from '../run-notifier';
import { emailService } from '../../email/email-service';

describe('RunNotifierService Unit Tests', () => {
  beforeEach(() => {
    emailService.mockProvider.clearLog();
  });

  it('formats dates accurately in Asia/Karachi (PKT, UTC+5) timezone', () => {
    const utcDate = new Date('2026-10-30T04:00:00Z');
    const formatted = runNotifierService.formatToKarachiTime(utcDate);

    // 04:00 UTC corresponds to 09:00 PKT (9:00 AM)
    expect(formatted).toContain('9:00');
  });

  it('calculates the next scheduled twice-daily run in Asia/Karachi time', () => {
    const nextRun = runNotifierService.getNextRunDetails();

    expect(nextRun.pkt).toBeDefined();
    expect(nextRun.utc).toBeDefined();
    expect(new Date(nextRun.utc).getTime()).toBeGreaterThan(Date.now());
  });

  it('constructs and sends comprehensive operational report to ziauldin371@gmail.com', async () => {
    const start = new Date(Date.now() - 45000);
    const finish = new Date();

    const result = await runNotifierService.sendRunSummaryReport({
      runId: 'test_run_001',
      status: 'completed',
      startTimeUtc: start,
      finishTimeUtc: finish,
      countriesSearched: ['US', 'UK', 'CA'],
      sourcesSearched: ['Google Places', 'UK Companies House', 'B2B Registry'],
      leadsDiscovered: 12,
      eligibleEmailContacts: 8,
      emailsSubmittedToGmail: 2,
      skippedRecordsCount: 4,
      skippedReasons: { 'Duplicate business record': 3, 'Below ICP score': 1 },
      businessesEmailedWithOtherChannels: [
        {
          businessName: 'FinFlow Compliance AI',
          email: 'sarah.jenkins@finflow-compliance.co.uk',
          channels: ['linkedin', 'twitter'],
          businessId: 'biz-004-finflow-ai',
        },
      ],
      operatingMode: 'approval',
    });

    expect(result.success).toBe(true);

    const logs = emailService.mockProvider.getSentLog();
    expect(logs.length).toBeGreaterThanOrEqual(1);

    const reportEmail = logs[logs.length - 1];
    expect(reportEmail.to).toBe('ziauldin371@gmail.com');
    expect(reportEmail.subject).toContain('[Growth System Agent] Run Report');
    expect(reportEmail.body).toContain('FinFlow Compliance AI');
    expect(reportEmail.body).toContain('Asia/Karachi');
  });
});

