import { DiscoveryRequest, DiscoveryRequestSchema } from '@/lib/validation/schemas';
import { IDiscoveryProvider, RawDiscoveredLead } from './types';
import { B2BMockProvider } from './providers/b2b-mock-provider';
import { GooglePlacesProvider } from './providers/google-places-provider';
import { CompaniesHouseProvider } from './providers/companies-house-provider';

export class DiscoveryService {
  private providers: Map<string, IDiscoveryProvider> = new Map();

  constructor() {
    this.registerProvider(new B2BMockProvider());
    this.registerProvider(new GooglePlacesProvider());
    this.registerProvider(new CompaniesHouseProvider());
  }

  public registerProvider(provider: IDiscoveryProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): IDiscoveryProvider | undefined {
    return this.providers.get(id);
  }

  public getProviders(): Array<{ id: string; name: string; isConfigured: boolean }> {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      isConfigured: p.isConfigured(),
    }));
  }

  public async executeDiscovery(rawInput: unknown): Promise<{
    providerUsed: string;
    leads: RawDiscoveredLead[];
    totalFound: number;
    warnings?: string[];
  }> {
    const validatedRequest = DiscoveryRequestSchema.parse(rawInput);
    const warnings: string[] = [];

    let provider: IDiscoveryProvider;

    if (validatedRequest.provider === 'auto') {
      if (validatedRequest.market === 'UK' && this.providers.get('companies_house')?.isConfigured()) {
        provider = this.providers.get('companies_house')!;
      } else if (this.providers.get('google_places')?.isConfigured()) {
        provider = this.providers.get('google_places')!;
      } else {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Live discovery credentials missing: GOOGLE_PLACES_API_KEY (or COMPANIES_HOUSE_API_KEY for UK) is required in production. Silent fallback to mock data is disabled.');
        }
        provider = this.providers.get('b2b_mock')!;
        warnings.push('External live discovery APIs are unconfigured (no API keys in environment). Running via Demo Sandbox Adapter. Records will be labeled DEMO.');
      }
    } else {
      const selected = this.providers.get(validatedRequest.provider);
      if (!selected) {
        throw new Error(`Discovery provider "${validatedRequest.provider}" not found.`);
      }
      if (!selected.isConfigured()) {
        if (selected.id === 'google_places') {
          throw new Error('Google Places key is missing: Configure GOOGLE_PLACES_API_KEY in environment.');
        }
        if (selected.id === 'companies_house') {
          throw new Error('Companies House key is missing: Configure COMPANIES_HOUSE_API_KEY in environment.');
        }
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Provider "${selected.name}" lacks credentials and cannot run in production.`);
        }
        warnings.push(`Provider "${selected.name}" lacks API credentials. Falling back to Demo Sandbox Adapter.`);
        provider = this.providers.get('b2b_mock')!;
      } else {
        provider = selected;
      }
    }

    const leads = await provider.discover(validatedRequest);
    if (provider.id === 'b2b_mock') {
      leads.forEach((l) => {
        (l as any).isDemo = true;
      });
    }

    return {
      providerUsed: provider.id,
      leads,
      totalFound: leads.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

export const discoveryService = new DiscoveryService();
