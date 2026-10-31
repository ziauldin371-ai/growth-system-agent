import { ILeadSource, LeadSourceSearchQuery, LeadSourceSearchResult, EmailVerificationResult } from './lead-source-interface';
import { BusinessEntity, ContactEntity } from '@/types';
import { dataStore } from '@/services/repository/data-store';

export class HunterAdapter implements ILeadSource {
  public readonly id = 'hunter';
  public readonly name = 'Hunter.io (Domain Search & Verifier)';
  public readonly category = 'official_api';

  private apiKey: string | null = null;
  private monthlyBudget = 100;
  private creditsUsed = 0;

  constructor() {
    this.apiKey = process.env.HUNTER_API_KEY || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
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
        source: 'hunter',
      };
    }

    // In live mode with HUNTER_API_KEY:
    try {
      const domain = query.niche ? `${query.niche.replace(/\s+/g, '').toLowerCase()}.com` : 'stripe.com';
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}&limit=${query.limit || 10}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Hunter API error: HTTP ${res.status}`);
      }
      const data = await res.json();
      this.creditsUsed += 1;
      dataStore.recordLeadSourceUsage('hunter', 1);

      const contacts: Partial<ContactEntity>[] = (data.data?.emails || []).map((e: any) => ({
        email: e.value,
        firstName: e.first_name || '',
        lastName: e.last_name || '',
        title: e.position || 'Executive',
        department: e.department || null,
        confidence: e.confidence || 80,
        isVerified: e.confidence >= 80,
        source: 'hunter.io',
      }));

      const company: Partial<BusinessEntity> = {
        name: data.data?.organization || domain,
        domain,
        country: data.data?.country || query.country || 'GLOBAL',
        industry: query.industry || 'Technology',
      };

      return {
        companies: [company],
        contacts,
        creditsUsed: 1,
        hasMore: false,
        source: 'hunter',
      };
    } catch (err) {
      console.warn('Hunter search API error, falling back:', err);
      return {
        companies: [],
        contacts: [],
        creditsUsed: 0,
        hasMore: false,
        source: 'hunter',
      };
    }
  }

  public async enrich(company: { domain: string; name?: string }): Promise<{
    company?: Partial<BusinessEntity>;
    contacts: Partial<ContactEntity>[];
    creditsUsed: number;
  }> {
    if (!this.isConfigured()) {
      return { contacts: [], creditsUsed: 0 };
    }

    try {
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(company.domain)}&api_key=${this.apiKey}&limit=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Hunter API HTTP ${res.status}`);
      const data = await res.json();
      this.creditsUsed += 1;
      dataStore.recordLeadSourceUsage('hunter', 1);

      const contacts: Partial<ContactEntity>[] = (data.data?.emails || []).map((e: any) => ({
        email: e.value,
        firstName: e.first_name || '',
        lastName: e.last_name || '',
        title: e.position || 'Leader',
        confidence: e.confidence || 75,
        isVerified: e.confidence >= 80,
        source: 'hunter.io',
      }));

      return {
        company: {
          name: data.data?.organization || company.name,
          domain: company.domain,
        },
        contacts,
        creditsUsed: 1,
      };
    } catch {
      return { contacts: [], creditsUsed: 0 };
    }
  }

  public async verifyEmail(email: string): Promise<EmailVerificationResult> {
    if (!this.isConfigured()) {
      return {
        email,
        isValid: false,
        isCatchAll: false,
        isDisposable: false,
        status: 'unknown',
        score: 0,
        source: 'hunter (unconfigured)',
      };
    }

    try {
      const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Hunter Verifier HTTP ${res.status}`);
      const data = await res.json();
      this.creditsUsed += 1;
      dataStore.recordLeadSourceUsage('hunter', 1);

      const result = data.data?.result || 'unknown';
      const score = data.data?.score || 0;

      return {
        email,
        isValid: result === 'deliverable',
        isCatchAll: result === 'risky' && data.data?.accept_all === true,
        isDisposable: data.data?.disposable === true,
        status: result === 'deliverable' ? 'valid' : result === 'undeliverable' ? 'invalid' : 'risky',
        score,
        source: 'hunter.io official verifier',
      };
    } catch {
      return {
        email,
        isValid: false,
        isCatchAll: false,
        isDisposable: false,
        status: 'unknown',
        score: 0,
        source: 'hunter error fallback',
      };
    }
  }
}

export const hunterAdapter = new HunterAdapter();

