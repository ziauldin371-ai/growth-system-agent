import { DiscoveryRequest, DiscoveryRequestSchema } from '@/lib/validation/schemas';
import { IDiscoveryProvider, RawDiscoveredLead } from './types';
import { B2BMockProvider } from './providers/b2b-mock-provider';
import { OpenStreetMapProvider } from './providers/open-street-map-provider';
import { GooglePlacesProvider } from './providers/google-places-provider';
import { CompaniesHouseProvider } from './providers/companies-house-provider';
import { GeoapifyProvider } from './providers/geoapify-provider';

export class DiscoveryService {
  private providers: Map<string, IDiscoveryProvider> = new Map();

  constructor() {
    this.registerProvider(new B2BMockProvider());
    this.registerProvider(new OpenStreetMapProvider());
    this.registerProvider(new GooglePlacesProvider());
    this.registerProvider(new CompaniesHouseProvider());
    this.registerProvider(new GeoapifyProvider());
  }

  public getActiveProviderId(): string {
    const envProvider = (process.env.DISCOVERY_PROVIDER || '').trim().toLowerCase();
    if (envProvider === 'google' || envProvider === 'google_places') {
      return 'google_places';
    }
    if (envProvider === 'geoapify') {
      return 'geoapify';
    }
    if (envProvider === 'osm' || envProvider === 'openstreetmap') {
      return 'osm';
    }
    if (this.providers.get('google_places')?.isConfigured()) {
      return 'google_places';
    }
    if (this.providers.get('geoapify')?.isConfigured()) {
      return 'geoapify';
    }
    return 'osm';
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
      const activeId = this.getActiveProviderId();
      if (activeId === 'google_places' && this.providers.get('google_places')?.isConfigured()) {
        provider = this.providers.get('google_places')!;
      } else if (activeId === 'geoapify' && this.providers.get('geoapify')?.isConfigured()) {
        provider = this.providers.get('geoapify')!;
      } else if (process.env.DISCOVERY_PROVIDER === 'osm') {
        provider = this.providers.get('osm')!;
      } else if (process.env.NODE_ENV === 'test') {
        provider = this.providers.get('b2b_mock')!;
      } else if (process.env.NODE_ENV === 'production') {
        provider = this.providers.get('osm')!;
      } else {
        provider = this.providers.get('osm')!;
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
