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
        provider = this.providers.get('b2b_mock')!;
        warnings.push('External live discovery APIs are unconfigured (no API keys found in environment). Running via Licensed B2B Sandbox Adapter.');
      }
    } else {
      const selected = this.providers.get(validatedRequest.provider);
      if (!selected) {
        throw new Error(`Discovery provider "${validatedRequest.provider}" not found.`);
      }
      if (!selected.isConfigured()) {
        warnings.push(`Provider "${selected.name}" lacks API credentials. Falling back to Sandbox Adapter.`);
        provider = this.providers.get('b2b_mock')!;
      } else {
        provider = selected;
      }
    }

    const leads = await provider.discover(validatedRequest);

    return {
      providerUsed: provider.id,
      leads,
      totalFound: leads.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

export const discoveryService = new DiscoveryService();
