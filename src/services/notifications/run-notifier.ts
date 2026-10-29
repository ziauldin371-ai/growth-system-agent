import { emailService } from '../email/email-service';
import { SchedulerRunHistoryEntity } from '@/types';

export interface RunNotificationDetails {
  runId: string;
  status: 'completed' | 'skipped' | 'failed';
  startTimeUtc: Date;
  finishTimeUtc: Date;
  countriesSearched: string[];
  sourcesSearched: string[];
  leadsDiscovered: number;
  eligibleEmailContacts: number;
  emailsSubmittedToGmail: number;
  skippedRecordsCount: number;
  skippedReasons: Record<string, number>;
  businessesEmailedWithOtherChannels: Array<{
    businessName: string;
    email: string;
    channels: string[];
    businessId: string;
  }>;
  errors?: string[];
  operatingMode: string;
}

export class RunNotifierService {
  private readonly recipient = 'ziauldin371@gmail.com';

  /**
   * Formats date into Asia/Karachi (PKT, UTC+5) timezone.
   */
  public formatToKarachiTime(date: Date): string {
    return new Intl.DateTimeFormat('en-PK', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(date);
  }

  /**
   * Calculates next scheduled run in Asia/Karachi time (09:00 or 17:00 PKT).
   */
  public getNextRunDetails(): { pkt: string; utc: string } {
    const now = new Date();
    // PKT is UTC+5
    const currentPktHour = (now.getUTCHours() + 5) % 24;

    const nextRun = new Date(now);
    if (currentPktHour < 9) {
      // Next run is today at 04:00 UTC (09:00 PKT)
      nextRun.setUTCHours(4, 0, 0, 0);
      if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
    } else if (currentPktHour < 17) {
      // Next run is today at 12:00 UTC (17:00 PKT)
      nextRun.setUTCHours(12, 0, 0, 0);
      if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
    } else {
      // Next run is tomorrow at 04:00 UTC (09:00 PKT)
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setUTCHours(4, 0, 0, 0);
    }

    return {
      pkt: this.formatToKarachiTime(nextRun),
      utc: nextRun.toISOString(),
    };
  }

  /**
   * Dispatches the run summary email to ziauldin371@gmail.com.
   */
  public async sendRunSummaryReport(details: RunNotificationDetails): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startPkt = this.formatToKarachiTime(details.startTimeUtc);
    const finishPkt = this.formatToKarachiTime(details.finishTimeUtc);
    const durationSeconds = Math.max(1, Math.round((details.finishTimeUtc.getTime() - details.startTimeUtc.getTime()) / 1000));
    const nextRun = this.getNextRunDetails();
    const appBaseUrl = process.env.APP_BASE_URL || 'https://growth-system-agent.vercel.app';

    const skippedReasonsText = Object.entries(details.skippedReasons)
      .map(([reason, count]) => `  • ${reason}: ${count}`)
      .join('\n') || '  • None';

    const emailedWithChannelsText = details.businessesEmailedWithOtherChannels.length > 0
      ? details.businessesEmailedWithOtherChannels
          .map(b => `  • ${b.businessName} (${b.email}) — Other channels: [${b.channels.join(', ')}]\n    Review: ${appBaseUrl}/email-sent-plus-channels`)
          .join('\n')
      : '  • None during this run';

    const plainTextBody = `GROWTH SYSTEM AGENT — AUTOMATED RUN OPERATIONAL REPORT
==============================================================
Operator: Zia Ul Din | AI & Automation Solutions
Target Notification: ${this.recipient}

RUN EXECUTION METRICS (Asia/Karachi PKT, UTC+5)
--------------------------------------------------------------
• Execution Status: ${details.status.toUpperCase()}
• Operating Mode: ${details.operatingMode.toUpperCase()}
• Started:  ${startPkt}
• Finished: ${finishPkt} (Duration: ${durationSeconds}s)
• Next Scheduled Run: ${nextRun.pkt} (${nextRun.utc})

DISCOVERY & TARGETING SUMMARY
--------------------------------------------------------------
• Countries Searched: ${details.countriesSearched.join(', ') || 'USA, UK, Worldwide'}
• Sources Processed:  ${details.sourcesSearched.join(', ')}
• Businesses Discovered: ${details.leadsDiscovered}
• Eligible Contacts Identified: ${details.eligibleEmailContacts}
• Emails Submitted to Gmail: ${details.emailsSubmittedToGmail}
• Skipped Records Count: ${details.skippedRecordsCount}
Reasons:
${skippedReasonsText}

MULTI-CHANNEL CLIENT TARGETS (Email Sent + Other Verified Channels)
--------------------------------------------------------------
${emailedWithChannelsText}

DASHBOARD QUICK ACCESS
--------------------------------------------------------------
• Worldwide Leads:           ${appBaseUrl}/leads
• Ready for Email:           ${appBaseUrl}/ready-for-email
• Sent Emails:               ${appBaseUrl}/sent-emails
• Email Sent + Other Channels: ${appBaseUrl}/email-sent-plus-channels
• No Email Available:        ${appBaseUrl}/no-email
• Run History & Errors:      ${appBaseUrl}/history

SYSTEM HEALTH & ERRORS
--------------------------------------------------------------
${details.errors && details.errors.length > 0 ? details.errors.join('\n') : 'All systems normal. 0 unhandled exceptions.'}
`;

    const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
  <div style="background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 24px; color: #ffffff;">
    <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Growth System Agent — Run Report</h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Autonomous B2B Pipeline Execution Summary</p>
  </div>
  
  <div style="padding: 24px;">
    <!-- Status Pill -->
    <div style="display: flex; gap: 8px; margin-bottom: 20px;">
      <span style="background: #10b98120; color: #34d399; border: 1px solid #10b98140; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">Status: ${details.status.toUpperCase()}</span>
      <span style="background: #6366f120; color: #818cf8; border: 1px solid #6366f140; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">Mode: ${details.operatingMode.toUpperCase()}</span>
    </div>

    <!-- Metrics Grid -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
      <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Discovered</div>
        <div style="font-size: 22px; font-weight: 700; color: #38bdf8;">${details.leadsDiscovered}</div>
      </div>
      <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Eligible Contacts</div>
        <div style="font-size: 22px; font-weight: 700; color: #a855f7;">${details.eligibleEmailContacts}</div>
      </div>
      <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Sent to Gmail</div>
        <div style="font-size: 22px; font-weight: 700; color: #34d399;">${details.emailsSubmittedToGmail}</div>
      </div>
    </div>

    <!-- Execution Details -->
    <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
      <div><strong>Execution Time (PKT):</strong> ${startPkt} &rarr; ${finishPkt} (${durationSeconds}s)</div>
      <div><strong>Next Scheduled Run:</strong> <span style="color: #38bdf8;">${nextRun.pkt}</span></div>
      <div><strong>Regions Searched:</strong> ${details.countriesSearched.join(', ') || 'USA, UK, Worldwide'}</div>
      <div><strong>Data Sources:</strong> ${details.sourcesSearched.join(', ')}</div>
    </div>

    <!-- Multi-Channel Section -->
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 14px; text-transform: uppercase; color: #94a3b8; margin: 0 0 10px 0;">Multi-Channel Follow-ups (Emailed + Verified Channels)</h3>
      ${details.businessesEmailedWithOtherChannels.length > 0 
        ? `<ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
            ${details.businessesEmailedWithOtherChannels.map(b => `<li><strong>${b.businessName}</strong> (${b.email}) &mdash; Channels: ${b.channels.join(', ')}</li>`).join('')}
          </ul>
          <div style="margin-top: 10px;">
            <a href="${appBaseUrl}/email-sent-plus-channels" style="color: #818cf8; text-decoration: underline; font-size: 13px;">Open Email Sent + Other Channels in Dashboard &rarr;</a>
          </div>`
        : `<p style="font-size: 13px; color: #64748b; margin: 0;">No businesses in this run met both criteria.</p>`
      }
    </div>

    <!-- CTA -->
    <div style="text-align: center; padding-top: 12px; border-top: 1px solid #334155;">
      <a href="${appBaseUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;">Open Growth System Dashboard</a>
    </div>
  </div>
</div>
`;

    try {
      const sendResult = await emailService.dispatchOutreachEmail({
        payload: {
          to: this.recipient,
          subject: `[Growth System Agent] Run Report: ${details.status.toUpperCase()} (${startPkt.split(',')[0]})`,
          body: plainTextBody,
          idempotencyKey: `run_report_${details.runId}`,
          metadata: { htmlBody },
        },
        isExplicitlyApproved: true,
        currentHour: 10, // Always allow operational reports
      });

      return {
        success: sendResult.success,
        messageId: sendResult.messageId,
        error: sendResult.error,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

export const runNotifierService = new RunNotifierService();

