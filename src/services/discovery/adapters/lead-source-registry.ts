import { ILeadSource } from './lead-source-interface';
import { hunterAdapter } from './hunter-adapter';
import { apolloAdapter } from './apollo-adapter';
import { snovAdapter } from './snov-adapter';
import { crunchbaseAdapter } from './crunchbase-adapter';
import { dataStore } from '@/services/repository/data-store';

export class LeadSourceRegistry {
  private sources: Map<string, ILeadSource> = new Map();

  constructor() {
    this.register(hunterAdapter);
    this.register(apolloAdapter);
    this.register(snovAdapter);
    this.register(crunchbaseAdapter);
  }

  public register(source: ILeadSource): void {
    this.sources.set(source.id, source);
  }

  public getSource(id: string): ILeadSource | undefined {
    return this.sources.get(id);
  }

  public getAllSources(): ILeadSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Generates a compliant CSV export of approved contacts and drafts for external
   * sending platforms (Instantly, Smartlead, Lemlist) when operator chooses to export manually.
   */
  public async generateExternalSendingToolCsv(options?: { includeUnapproved?: boolean }): Promise<string> {
    const drafts = await dataStore.getDrafts({ limit: 1000, includeDemo: false });
    const approved = options?.includeUnapproved ? drafts : drafts.filter(d => d.status === 'approved');

    const headers = [
      'Email',
      'First Name',
      'Last Name',
      'Company Name',
      'Subject Line',
      'Personalized Pitch Body',
      'Source Platform',
      'Website Domain',
      'Compliance Unsubscribe Footer'
    ];

    const rows = approved.map(d => {
      const bizName = (d as any).businessName || 'Valued Business';
      const cleanSubject = `"${(d.selectedSubject || '').replace(/"/g, '""')}"`;
      const cleanBody = `"${(d.emailBody || '').replace(/"/g, '""')}"`;
      const footer = `"To stop further communications, reply stop or visit unsubscribe."`;

      return [
        d.recipientEmail || '',
        '',
        '',
        `"${bizName.replace(/"/g, '""')}"`,
        cleanSubject,
        cleanBody,
        'Growth System Agent Verified Pipeline',
        (d as any).domain || '',
        footer
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const leadSourceRegistry = new LeadSourceRegistry();
