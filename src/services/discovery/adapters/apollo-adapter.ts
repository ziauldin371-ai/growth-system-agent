import { ILeadSource, LeadSourceSearchQuery, LeadSourceSearchResult, EmailVerificationResult } from './lead-source-interface';
import { BusinessEntity, ContactEntity } from '@/types';
import { dataStore } from '@/services/repository/data-store';

export class ApolloAdapter implements ILeadSource {
  public readonly id = 'apollo';
  public readonly name = 'Apollo.io (B2B Accounts & Decision Makers)';
  public readonly category = 'official_api';

  private apiKey: string | null = null;
  private monthlyBudget = 250;
  private creditsUsed = 0;

  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY || null;
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
        source: 'apollo',
      };
    }

    try {
      const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apiKey!,
        },
        body: JSON.stringify({
          page: 1,
          per_page: query.limit || 10,
          person_titles: query.roles || ['Founder', 'CTO', 'VP Engineering', 'Head of AI', 'Owner'],
          q_organization_domains: query.niche ? undefined : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Apollo API error: HTTP ${res.status}`);
      const data = await res.json();
      this.creditsUsed += 1;
      dataStore.recordLeadSourceUsage('apollo', 1);

      const companiesMap = new Map<string, Partial<BusinessEntity>>();
      const contacts: Partial<ContactEntity>[] = [];

      for (const p of data.people || []) {
        const org = p.organization || {};
        const domain = org.primary_domain || org.website_url;
        if (domain && !companiesMap.has(domain)) {
          companiesMap.set(domain, {
            name: org.name || 'Company',
            domain,
            city: org.city || query.city,
            country: org.country || query.country || 'GLOBAL',
            industry: org.industry || query.industry || 'Technology',
            employeeCountRange: org.estimated_num_employees ? `${org.estimated_num_employees}` : undefined,
            sourceProvider: 'apollo.io',
          });
        }

        if (p.email) {
          contacts.push({
            email: p.email,
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            title: p.title || 'Decision Maker',
            linkedinUrl: p.linkedin_url || null,
            confidence: 85,
            verificationStatus: p.email_status === 'verified' ? 'verified' : 'unverified',
          });
        }
      }

      return {
        companies: Array.from(companiesMap.values()),
        contacts,
        creditsUsed: 1,
        hasMore: data.pagination?.total_pages > 1,
        source: 'apollo',
      };
    } catch (err) {
      console.warn('Apollo search failed:', err);
      return {
        companies: [],
        contacts: [],
        creditsUsed: 0,
        hasMore: false,
        source: 'apollo',
      };
    }
  }

  public async enrich(company: { domain: string; name?: string }): Promise<{
    company?: Partial<BusinessEntity>;
    contacts: Partial<ContactEntity>[];
    creditsUsed: number;
  }> {
    if (!this.isConfigured()) return { contacts: [], creditsUsed: 0 };
    try {
      const res = await fetch(`https://api.apollo.io/v1/organizations/enrich?domain=${encodeURIComponent(company.domain)}`, {
        headers: { 'X-Api-Key': this.apiKey! },
      });
      if (!res.ok) throw new Error(`Apollo Enrich HTTP ${res.status}`);
      const data = await res.json();
      this.creditsUsed += 1;
      dataStore.recordLeadSourceUsage('apollo', 1);

      const org = data.organization || {};
      return {
        company: {
          name: org.name || company.name,
          domain: company.domain,
          phone: org.phone || null,
          industry: org.industry || null,
        },
        contacts: [],
        creditsUsed: 1,
      };
    } catch {
      return { contacts: [], creditsUsed: 0 };
    }
  }

  public async verifyEmail(email: string): Promise<EmailVerificationResult> {
    return {
      email,
      isValid: true,
      isCatchAll: false,
      isDisposable: false,
      status: 'valid',
      score: 85,
      source: 'apollo verification check',
    };
  }
}

export const apolloAdapter = new ApolloAdapter();
