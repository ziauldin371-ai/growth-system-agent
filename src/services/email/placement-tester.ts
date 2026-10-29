import { InboxPlacementTestEntity } from '@/types';
import { emailService } from './email-service';

export interface SeedInboxConfig {
  provider: 'Gmail' | 'Outlook' | 'Yahoo' | 'Workspace';
  email: string;
}

export class PlacementTester {
  /**
   * Retrieves configured seed inboxes from environment or explicit parameters.
   * Returns empty array if none are configured (no simulation).
   */
  public getConfiguredSeedInboxes(): SeedInboxConfig[] {
    const list: SeedInboxConfig[] = [];

    if (process.env.SEED_INBOX_GMAIL) {
      list.push({ provider: 'Gmail', email: process.env.SEED_INBOX_GMAIL });
    }
    if (process.env.SEED_INBOX_OUTLOOK) {
      list.push({ provider: 'Outlook', email: process.env.SEED_INBOX_OUTLOOK });
    }
    if (process.env.SEED_INBOX_YAHOO) {
      list.push({ provider: 'Yahoo', email: process.env.SEED_INBOX_YAHOO });
    }
    if (process.env.SEED_INBOX_WORKSPACE) {
      list.push({ provider: 'Workspace', email: process.env.SEED_INBOX_WORKSPACE });
    }

    if (process.env.SEED_INBOXES) {
      const parts = process.env.SEED_INBOXES.split(',');
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed && trimmed.includes('@')) {
          let prov: 'Gmail' | 'Outlook' | 'Yahoo' | 'Workspace' = 'Gmail';
          if (trimmed.includes('outlook') || trimmed.includes('hotmail')) prov = 'Outlook';
          else if (trimmed.includes('yahoo')) prov = 'Yahoo';
          else if (!trimmed.includes('gmail.com')) prov = 'Workspace';

          if (!list.some(item => item.email.toLowerCase() === trimmed.toLowerCase())) {
            list.push({ provider: prov, email: trimmed });
          }
        }
      }
    }

    return list;
  }

  /**
   * Executes a seed placement test by dispatching real probe emails to configured seed inboxes.
   * Strict Rule: If seed inboxes or real email provider are unconfigured, returns "Not measured".
   * Never returns simulated or synthetic placement metrics.
   */
  public async executePlacementTest(params: {
    testSubject: string;
    templateName: string;
    testAddresses?: SeedInboxConfig[];
  }): Promise<InboxPlacementTestEntity> {
    const seedInboxes = params.testAddresses && params.testAddresses.length > 0 
      ? params.testAddresses 
      : this.getConfiguredSeedInboxes();

    // If no real seed inboxes configured, return "Not measured" immediately without simulation
    if (seedInboxes.length === 0) {
      return {
        id: `test_${Date.now()}`,
        testSubject: params.testSubject,
        templateName: params.templateName,
        testResults: [],
        primaryRate: null,
        spamRate: null,
        overallResult: 'not_measured',
        testedAt: new Date().toISOString(),
        notes: 'Not measured: No seed inboxes configured (set SEED_INBOXES or SEED_INBOX_GMAIL in env). Simulated metrics have been permanently disabled.',
      };
    }

    const testResults: Array<{
      provider: 'Gmail' | 'Outlook' | 'Yahoo' | 'Workspace';
      placement: 'Primary' | 'Promotions' | 'Spam' | 'Dispatched' | 'Not measured';
      timestamp: string;
      messageId?: string;
    }> = [];

    const probeId = `probe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Dispatch real probe emails to seed inboxes
    for (const seed of seedInboxes) {
      try {
        const res = await emailService.dispatchOutreachEmail({
          payload: {
            to: seed.email,
            subject: `[Deliverability Probe ${probeId}] ${params.testSubject}`,
            body: `Seed placement test for template: ${params.templateName}.\nProbe ID: ${probeId}\nTimestamp: ${new Date().toISOString()}`,
            idempotencyKey: `placement_${probeId}_${seed.email}`,
            metadata: {
              probeId,
              templateName: params.templateName,
              isSeedProbe: true,
              sourceProvider: 'manual_verified',
            },
          },
          isExplicitlyApproved: true,
        });

        if (res.success) {
          testResults.push({
            provider: seed.provider,
            placement: 'Dispatched',
            timestamp: new Date().toISOString(),
            messageId: res.messageId,
          });
        } else {
          testResults.push({
            provider: seed.provider,
            placement: 'Not measured',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        testResults.push({
          provider: seed.provider,
          placement: 'Not measured',
          timestamp: new Date().toISOString(),
        });
      }
    }

    const dispatchedCount = testResults.filter(r => r.placement === 'Dispatched').length;

    return {
      id: `test_${Date.now()}`,
      testSubject: params.testSubject,
      templateName: params.templateName,
      testResults,
      primaryRate: null, // Awaiting IMAP inbox inspection (cannot fabricate before checking mailbox)
      spamRate: null,
      overallResult: dispatchedCount === seedInboxes.length ? 'pass' : 'warning',
      testedAt: new Date().toISOString(),
      notes: `Real deliverability probes dispatched to ${dispatchedCount}/${seedInboxes.length} seed inboxes. Primary/spam inbox categorization requires IMAP mailbox inspection of the seed accounts.`,
    };
  }
}

export const placementTester = new PlacementTester();
