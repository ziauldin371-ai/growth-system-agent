import { IDiscoveryProvider, RawDiscoveredLead } from '../types';
import { DiscoveryRequest } from '@/lib/validation/schemas';
import { dataStore } from '@/services/repository/data-store';
import { resolveOsmCategoryPreset, OsmCategoryPreset } from './osm-category-mappings';
import { normalizeBusinessName } from '@/services/crm/normalization';

/**
 * OpenStreetMap Discovery Provider
 * Uses public Overpass API with Nominatim geocoding.
 * Adheres strictly to Fair-Use policies:
 * - Real identifying User-Agent (app + operator contact)
 * - Minimum 1 second delay between Nominatim calls
 * - Overpass query timeouts and exponential backoff
 * - 30-day database result caching per (city, category)
 * - Strict per-run limits
 * - Attribution: Data © OpenStreetMap contributors (ODbL)
 */
export class OpenStreetMapProvider implements IDiscoveryProvider {
  public readonly id = 'osm';
  public readonly name = 'OpenStreetMap (Overpass & Nominatim)';

  // Fair-use Nominatim rate limiting: at most 1 request per second
  private static lastNominatimRequest = 0;

  // Resilient Overpass mirror endpoints
  private static readonly OVERPASS_MIRRORS = [
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
  ];

  public isConfigured(): boolean {
    // OpenStreetMap is free and public; always configured
    return true;
  }

  private getUserAgent(): string {
    const adminEmail = process.env.ADMIN_EMAIL || 'ziauldin371@gmail.com';
    const baseUrl = process.env.APP_BASE_URL || 'https://growth-system-agent-brown.vercel.app';
    return `GrowthSystemAgent/1.0 (${baseUrl}; ${adminEmail})`;
  }

  private async throttleNominatim(): Promise<void> {
    const now = Date.now();
    const elapsed = now - OpenStreetMapProvider.lastNominatimRequest;
    if (elapsed < 1100) {
      const waitTime = 1100 - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    OpenStreetMapProvider.lastNominatimRequest = Date.now();
  }

  /**
   * Geocode city/location to bounding box using Nominatim
   */
  public async geocodeBoundingBox(
    location: string
  ): Promise<{ south: number; north: number; west: number; east: number; displayName: string } | null> {
    await this.throttleNominatim();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        headers: { 'User-Agent': this.getUserAgent() },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const first = data[0];
      // Nominatim boundingbox: [minLat (south), maxLat (north), minLon (west), maxLon (east)]
      const bbox = first.boundingbox;
      if (!bbox || bbox.length < 4) return null;

      return {
        south: parseFloat(bbox[0]),
        north: parseFloat(bbox[1]),
        west: parseFloat(bbox[2]),
        east: parseFloat(bbox[3]),
        displayName: first.display_name || location,
      };
    } catch {
      return null;
    }
  }

  /**
   * Query Overpass API with exponential backoff on 429/502/504 and mirror rotation
   */
  public async queryOverpass(
    qlQuery: string,
    timeoutMs: number = 25000
  ): Promise<{ elements: any[] } | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const mirror = OpenStreetMapProvider.OVERPASS_MIRRORS[attempt % OpenStreetMapProvider.OVERPASS_MIRRORS.length];
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(`${mirror}?data=${encodeURIComponent(qlQuery)}`, {
          headers: {
            'User-Agent': this.getUserAgent(),
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.status === 429 || res.status === 502 || res.status === 504) {
          // Exponential backoff
          const backoff = (attempt + 1) * 1500;
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.elements)) {
            return data;
          }
        }
      } catch {
        // Retry next mirror on network / abort error
      }
    }
    return null;
  }

  /**
   * Fallback Nominatim Category Search if Overpass mirrors are busy
   */
  public async queryNominatimCategory(
    categoryQuery: string,
    location: string,
    limit: number
  ): Promise<any[]> {
    await this.throttleNominatim();
    const query = `${categoryQuery}, ${location}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=${Math.min(limit, 25)}&addressdetails=1&extratags=1`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        headers: { 'User-Agent': this.getUserAgent() },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /**
   * Main Discover Entry Point
   */
  public async discover(request: DiscoveryRequest): Promise<RawDiscoveredLead[]> {
    const limit = Math.min(request.limit || 10, 25);
    const location = request.location || request.market || 'London, UK';
    const preset = resolveOsmCategoryPreset(request.industry || (request as any).query);

    // 1. Check 30-day Database Cache
    const cityKey = location.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const catKey = preset.id;
    const cacheKey = `osm:${cityKey}:${catKey}`;

    const cached = dataStore.getDiscoveryCache ? dataStore.getDiscoveryCache(cacheKey) : null;
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached.slice(0, limit);
    }

    let rawElements: any[] = [];

    // 2. Geocode Bounding Box
    const bbox = await this.geocodeBoundingBox(location);

    if (bbox) {
      // Build Overpass QL
      // Format: (south, west, north, east)
      const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
      const tagQueries = preset.overpassTags
        .map((t) => (t.val ? `node["${t.key}"="${t.val}"](${bboxStr}); way["${t.key}"="${t.val}"](${bboxStr});` : `node["${t.key}"](${bboxStr}); way["${t.key}"](${bboxStr});`))
        .join('\n  ');

      const ql = `[out:json][timeout:25];
(
  ${tagQueries}
);
out center ${limit * 2};`;

      const overpassData = await this.queryOverpass(ql);
      if (overpassData && overpassData.elements?.length > 0) {
        rawElements = overpassData.elements;
      }
    }

    // 3. Resilient Fallback: If Overpass is unavailable or returned 0, search via Nominatim
    if (rawElements.length === 0) {
      const nomResults = await this.queryNominatimCategory(preset.nominatimQuery, location, limit * 2);
      rawElements = nomResults.map((nr) => ({
        type: nr.osm_type || 'node',
        id: nr.osm_id,
        lat: parseFloat(nr.lat),
        lon: parseFloat(nr.lon),
        tags: {
          name: nr.name || nr.display_name?.split(',')[0],
          'addr:housenumber': nr.address?.house_number,
          'addr:street': nr.address?.road,
          'addr:city': nr.address?.city || nr.address?.town || nr.address?.quarter,
          'addr:postcode': nr.address?.postcode,
          'addr:country': nr.address?.country,
          website: nr.extratags?.website || nr.extratags?.contact_website || nr.extratags?.url,
          phone: nr.extratags?.phone || nr.extratags?.contact_phone,
          email: nr.extratags?.email || nr.extratags?.contact_email,
          opening_hours: nr.extratags?.opening_hours,
          'contact:facebook': nr.extratags?.['contact:facebook'] || nr.extratags?.facebook,
          'contact:instagram': nr.extratags?.['contact:instagram'] || nr.extratags?.instagram,
          ...(nr.extratags || {}),
        },
      }));
    }

    // 4. Quality Filter, Honest Evidence Mapping & Deduplication
    const leads: RawDiscoveredLead[] = [];
    const seenNames = new Set<string>();

    for (const el of rawElements) {
      if (leads.length >= limit) break;

      const tags = el.tags || {};
      const rawName = tags.name || tags['name:en'];

      // Quality filter 1: Skip if no name
      if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
        continue;
      }

      const name = rawName.trim();

      // Quality filter 2: Skip permanently closed / disused
      if (
        tags.disused === 'yes' ||
        tags.abandoned === 'yes' ||
        tags.end_date ||
        tags.opening_hours === 'closed' ||
        tags.historic === 'demolished'
      ) {
        continue;
      }

      // Quality filter 3: Deduplicate identical name in close proximity
      const normName = normalizeBusinessName(name);
      if (seenNames.has(normName)) {
        continue;
      }
      seenNames.add(normName);

      // Extract coordinates
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;

      // Address construction
      const addressParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:postcode'],
        tags['addr:city'] || tags['addr:town'],
        tags['addr:country'],
      ].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : null;
      const city = tags['addr:city'] || tags['addr:town'] || location.split(',')[0].trim();
      const country = tags['addr:country'] || (location.includes(',') ? location.split(',')[1].trim() : 'Global');

      // Contact details
      const phone = tags.phone || tags['contact:phone'] || null;
      const website = tags.website || tags['contact:website'] || tags.url || null;
      const email = tags.email || tags['contact:email'] || null;
      const openingHours = tags.opening_hours || null;

      // Social links
      const socialUrls: string[] = [];
      const fb = tags['contact:facebook'] || tags.facebook;
      if (fb) socialUrls.push(fb.startsWith('http') ? fb : `https://facebook.com/${fb}`);
      const insta = tags['contact:instagram'] || tags.instagram;
      if (insta) socialUrls.push(insta.startsWith('http') ? insta : `https://instagram.com/${insta}`);

      // OSM identifier & canonical web link
      const osmType = el.type || 'node';
      const osmId = el.id ? String(el.id) : null;
      const osmLink = osmId ? `https://www.openstreetmap.org/${osmType}/${osmId}` : null;

      // Honest Evidence Rules (Requirement 4):
      // - "No website" labeled "No website listed on OpenStreetMap (check before assuming)". Never claimed as proven fact.
      // - Never invent ratings, review counts, revenue, or traffic.
      // - A lead with no stored evidence gets no opportunity line.
      const evidence: RawDiscoveredLead['evidence'] = [];

      if (website) {
        evidence.push({
          sourceName: 'OpenStreetMap',
          sourceUrl: osmLink || undefined,
          observationTime: new Date().toISOString(),
          evidenceType: 'osm_website',
          summary: `Website listed on OpenStreetMap: ${website}`,
          isFactual: true,
          confidence: 0.9,
          metadata: {
            website,
            osmId,
            osmType,
          },
        });
      } else {
        evidence.push({
          sourceName: 'OpenStreetMap',
          sourceUrl: osmLink || undefined,
          observationTime: new Date().toISOString(),
          evidenceType: 'no_website_osm',
          summary: 'No website listed on OpenStreetMap (check before assuming)',
          isFactual: false,
          confidence: 0.6,
          metadata: {
            osmId,
            osmType,
          },
        });
      }

      // Requirement 5: Contact rules
      // An email taken from OSM tags is UNVERIFIED until it passes email verification (syntax, MX, suppression list).
      const contacts: RawDiscoveredLead['contacts'] = [];
      if (email && email.includes('@')) {
        contacts.push({
          fullName: name,
          email: email.trim().toLowerCase(),
          phone: phone || undefined,
          confidence: 0.7,
          verificationStatus: 'unverified', // Strictly unverified
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
        industry: preset.defaultIndustry,
        sourceProvider: 'OpenStreetMap',
        sourceIdentifier: osmId,
        fetchedAt: new Date().toISOString(),
        socialUrls: socialUrls.length > 0 ? socialUrls : undefined,
        rawPayloadRef: {
          osmId,
          osmType,
          osmLink,
          lat,
          lon,
          openingHours,
          attribution: 'Data © OpenStreetMap contributors (ODbL)',
        },
        evidence,
        contacts,
      });
    }

    // 5. Cache results in database for 30 days
    if (leads.length > 0 && dataStore.saveDiscoveryCache) {
      dataStore.saveDiscoveryCache(cacheKey, leads);
    }

    return leads;
  }
}
