import { IDiscoveryProvider, RawDiscoveredLead } from '../types';
import { DiscoveryRequest } from '@/lib/validation/schemas';
import { normalizeBusinessName } from '@/services/crm/normalization';

/**
 * Optional Geoapify Places API Provider
 * Enabled only if GEOAPIFY_API_KEY exists (Free tier, no card required).
 * Adheres strictly to the same honest evidence and unverified contact rules.
 */
export class GeoapifyProvider implements IDiscoveryProvider {
  public readonly id = 'geoapify';
  public readonly name = 'Geoapify Places API (Free Tier)';

  public isConfigured(): boolean {
    return Boolean(process.env.GEOAPIFY_API_KEY && process.env.GEOAPIFY_API_KEY.trim().length > 0);
  }

  /**
   * Map search queries to Geoapify place categories
   */
  private mapCategory(industry?: string): string {
    const norm = (industry || '').toLowerCase();
    if (norm.includes('dent') || norm.includes('clinic') || norm.includes('health')) {
      return 'healthcare.clinic,healthcare.dentist';
    }
    if (norm.includes('restaurant') || norm.includes('food') || norm.includes('cafe')) {
      return 'catering.restaurant,catering.cafe';
    }
    if (norm.includes('salon') || norm.includes('barber') || norm.includes('beauty')) {
      return 'service.beauty,service.hairdresser';
    }
    if (norm.includes('gym') || norm.includes('fitness')) {
      return 'sport.fitness';
    }
    if (norm.includes('auto') || norm.includes('car')) {
      return 'service.vehicle.repair';
    }
    if (norm.includes('hotel') || norm.includes('lodg')) {
      return 'accommodation.hotel';
    }
    if (norm.includes('retail') || norm.includes('shop')) {
      return 'commercial.supermarket,commercial.clothing';
    }
    return 'commercial,service';
  }

  public async discover(request: DiscoveryRequest): Promise<RawDiscoveredLead[]> {
    if (!this.isConfigured()) {
      throw new Error('Geoapify API key is missing. Configure GEOAPIFY_API_KEY in environment.');
    }

    const apiKey = process.env.GEOAPIFY_API_KEY!;
    const limit = Math.min(request.limit || 10, 25);
    const location = request.location || request.market || 'London, UK';
    const categories = this.mapCategory(request.industry);

    const query = `${request.industry || 'business'} in ${location}`;
    const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(
      categories
    )}&text=${encodeURIComponent(query)}&limit=${limit}&apiKey=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Geoapify Places API responded with status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const features: any[] = Array.isArray(data.features) ? data.features : [];

    const leads: RawDiscoveredLead[] = [];
    const seenNames = new Set<string>();

    for (const feat of features) {
      if (leads.length >= limit) break;

      const props = feat.properties || {};
      const rawName = props.name;

      // Quality filter 1: Skip if no name
      if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
        continue;
      }

      const name = rawName.trim();
      const normName = normalizeBusinessName(name);
      if (seenNames.has(normName)) continue;
      seenNames.add(normName);

      const address = props.formatted || [props.housenumber, props.street, props.postcode, props.city, props.country].filter(Boolean).join(', ') || null;
      const city = props.city || location.split(',')[0].trim();
      const country = props.country || (location.includes(',') ? location.split(',')[1].trim() : 'Global');
      const phone = props.contact?.phone || null;
      const website = props.website || null;
      const email = props.contact?.email || null;
      const placeId = props.place_id || null;

      const evidence: RawDiscoveredLead['evidence'] = [];
      if (website) {
        evidence.push({
          sourceName: 'Geoapify',
          observationTime: new Date().toISOString(),
          evidenceType: 'geoapify_website',
          summary: `Website listed on Geoapify: ${website}`,
          isFactual: true,
          confidence: 0.9,
          metadata: { website, placeId },
        });
      } else {
        evidence.push({
          sourceName: 'Geoapify',
          observationTime: new Date().toISOString(),
          evidenceType: 'no_website_geoapify',
          summary: 'No website listed on Geoapify (check before assuming)',
          isFactual: false,
          confidence: 0.6,
          metadata: { placeId },
        });
      }

      const contacts: RawDiscoveredLead['contacts'] = [];
      if (email && email.includes('@')) {
        contacts.push({
          fullName: name,
          email: email.trim().toLowerCase(),
          phone: phone || undefined,
          confidence: 0.7,
          verificationStatus: 'unverified',
          isPrimary: true,
        });
      }

      leads.push({
        name,
        domain: website ? website.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase() : null,
        country,
        city,
        address,
        phone,
        industry: request.industry || 'Commercial Services',
        sourceProvider: 'Geoapify',
        sourceIdentifier: placeId,
        fetchedAt: new Date().toISOString(),
        rawPayloadRef: {
          placeId,
          categories: props.categories,
          attribution: 'Powered by Geoapify | © OpenStreetMap contributors',
        },
        evidence,
        contacts,
      });
    }

    return leads;
  }
}

