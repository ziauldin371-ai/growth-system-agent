import { BusinessEntity, ContactEntity } from '@/types';

export interface LeadSourceSearchQuery {
  industry?: string;
  niche?: string;
  country?: string;
  city?: string;
  limit?: number;
  roles?: string[];
}

export interface LeadSourceSearchResult {
  companies: Partial<BusinessEntity>[];
  contacts: Partial<ContactEntity>[];
  creditsUsed: number;
  hasMore: boolean;
  source: string;
}

export interface EmailVerificationResult {
  email: string;
  isValid: boolean;
  isCatchAll: boolean;
  isDisposable: boolean;
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  score: number; // 0 - 100
  source: string;
}

export interface ILeadSource {
  readonly id: string;
  readonly name: string;
  readonly category: 'official_api' | 'csv_import' | 'paste_importer';
  
  isConfigured(): boolean;
  getHealthStatus(): 'healthy' | 'degraded' | 'not_configured' | 'rate_limited';
  getMonthlyBudget(): number;
  getCreditsUsed(): number;
  
  search(query: LeadSourceSearchQuery): Promise<LeadSourceSearchResult>;
  enrich(company: { domain: string; name?: string }): Promise<{
    company?: Partial<BusinessEntity>;
    contacts: Partial<ContactEntity>[];
    creditsUsed: number;
  }>;
  verifyEmail(email: string): Promise<EmailVerificationResult>;
}

