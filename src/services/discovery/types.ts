import { DiscoveryRequest } from '@/lib/validation/schemas';
import { BusinessEntity, GrowthEvidenceEntity, ContactEntity } from '@/types';

export interface RawDiscoveredLead {
  name: string;
  domain?: string | null;
  country: string;
  region?: string | null;
  city?: string | null;
  postalCode?: string | null;
  address?: string | null;
  phone?: string | null;
  industry?: string | null;
  companyType?: string | null;
  employeeCountRange?: string | null;
  annualRevenueRange?: string | null;
  sourceProvider: string;
  sourceIdentifier?: string | null;
  fetchedAt?: string;
  rawPayloadRef?: Record<string, any>;
  isPermanentlyClosed?: boolean;
  socialUrls?: string[];
  evidence: Array<{
    sourceName: string;
    sourceUrl?: string | null;
    observationTime: string;
    evidenceType: string;
    summary: string;
    isFactual: boolean;
    confidence: number;
    metadata?: Record<string, any>;
  }>;
  contacts?: Array<{
    fullName: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    confidence: number;
    verificationStatus: 'verified' | 'unverified';
    isPrimary: boolean;
  }>;
}

export interface IDiscoveryProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  discover(request: DiscoveryRequest): Promise<RawDiscoveredLead[]>;
}
