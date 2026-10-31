import { ILeadSource, LeadSourceSearchQuery, LeadSourceSearchResult, EmailVerificationResult } from './lead-source-interface';
import { BusinessEntity, ContactEntity } from '@/types';
import { dataStore } from '@/services/repository/data-store';

export class CrunchbaseAdapter implements ILeadSource {
  public readonly id = 'crunchbase';
  public readonly name = 'Crunchbase (Company Intelligence & Funding Signals)';
  public readonly category = 'official_api';

  private userKey: string | null = null;
  private monthlyBudget = 50;
  private creditsUsed = 0;

  constructor() {
    this.userKey = process.env.CRUNCHBASE_API_KEY || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.userKey && this.userKey.trim().length > 0);
  }

  public getHealthStatus(): 'healthy' | 'degraded' | 'not_configured' | 'rate_limited' {
    if (!this.isConfigured()) return 'not_configured';
    if (this.creditsUsed >= this.monthlyBudget) return 'rate_limited';
    return 'healthy';
  }

  public getMonthlyBudget(): number {
    return this.monthlyBudget;
  }

  public setMonthlyBudget(budget: number): void {
    this.monthlyBudget = Math.max(1, budget);
  }

  public getCreditsUsed(): number {
    return this.creditsUsed;
  }

  public async search(query: LeadSourceSearchQuery): Promise<LeadSourceSearchResult> {
    if (!this.isConfigured()) {
      return {
        companies: [],
        contacts: [],
        creditsUsed: 0,
        hasMore: false,
        source: 'crunchbase',
      };
    }

    try {
      const url = `https://api.crunchbase.com/api/v4/searches/organizations?user_key=${this.userKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_ids: ['identifier', 'short_description', 'location_identifiers', 'categories'],
          limit: query.limit || 10,
        }),
      });
      if (!res.ok) throw new Error(`Crunchbase API HTTP ${res.status}`);
      const data = await res.json();
      this.creditsUsed += 1;
      dataStore.recordLeadSourceUsage('crunchbase', 1);

      const companies: Partial<BusinessEntity>[] = (data.entities || []).map((e: any) => ({
        name: e.properties?.identifier?.value || 'Company',
        domain: e.properties?.identifier?.permalink ? `${e.properties.identifier.permalink}.com` : undefined,
        industry: query.industry || 'Technology',
        sourceProvider: 'crunchbase',
      }));

      return {
        companies,
        contacts: [],
        creditsUsed: 1,
        hasMore: false,
        source: 'crunchbase',
      };
    } catch {
      return {
        companies: [],
        contacts: [],
        creditsUsed: 0,
        hasMore: false,
        source: 'crunchbase',
      };
    }
  }

  public async enrich(company: { domain: string; name?: string }): Promise<{
    company?: Partial<BusinessEntity>;
    contacts: Partial<ContactEntity>[];
    creditsUsed: number;
  }> {
    if (!this.isConfigured()) return { contacts: [], creditsUsed: 0 };
    this.creditsUsed += 1;
    dataStore.recordLeadSourceUsage('crunchbase', 1);
    return { contacts: [], creditsUsed: 1 };
  }

  public async verifyEmail(email: string): Promise<EmailVerificationResult> {
    return {
      email,
      isValid: false,
      isCatchAll: false,
      isDisposable: false,
      status: 'unknown',
      score: 0,
      source: 'crunchbase does not provide email verification',
    };
  }
}

export const crunchbaseAdapter = new CrunchbaseAdapter();

