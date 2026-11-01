import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenStreetMapProvider } from '../providers/open-street-map-provider';
import { resolveOsmCategoryPreset } from '../providers/osm-category-mappings';
import { DiscoveryService } from '../discovery-service';
import { dataStore } from '@/services/repository/data-store';

describe('OpenStreetMap Provider (Overpass & Nominatim)', () => {
  let provider: OpenStreetMapProvider;

  // Recorded realistic Overpass fixture
  const fixtureOverpassResponse = {
    elements: [
      {
        type: 'node',
        id: 1001,
        lat: 51.5074,
        lon: -0.1278,
        tags: {
          name: 'The Baker Street Clinic',
          'addr:housenumber': '221B',
          'addr:street': 'Baker Street',
          'addr:city': 'London',
          'addr:postcode': 'NW1 6XE',
          'addr:country': 'United Kingdom',
          website: 'https://bakerstreetclinic.co.uk',
          phone: '+44 20 7946 0912',
          email: 'reception@bakerstreetclinic.co.uk',
          opening_hours: 'Mo-Fr 08:30-18:00',
          'contact:facebook': 'https://facebook.com/bakerclinic',
          'contact:instagram': 'https://instagram.com/bakerclinic',
        },
      },
      {
        type: 'node',
        id: 1002,
        lat: 51.5085,
        lon: -0.1285,
        tags: {
          name: 'Central Dental Practice',
          'addr:housenumber': '14',
          'addr:street': 'Central Way',
          'addr:city': 'London',
          phone: '+44 20 7946 0999',
          // NO website tag
          // NO email tag
        },
      },
      {
        type: 'node',
        id: 1003,
        lat: 51.5090,
        lon: -0.1290,
        tags: {
          name: 'Old Closed Surgery',
          disused: 'yes', // Permanently closed
        },
      },
      {
        type: 'node',
        id: 1004,
        lat: 51.5095,
        lon: -0.1295,
        tags: {
          // No name tag!
          amenity: 'dentist',
        },
      },
      {
        type: 'node',
        id: 1005,
        lat: 51.5075,
        lon: -0.1279,
        tags: {
          name: 'The Baker Street Clinic', // Duplicate of 1001
          'addr:street': 'Baker Street',
        },
      },
    ],
  };

  const fixtureNominatimBbox = [
    {
      place_id: 12345,
      boundingbox: ['51.28', '51.69', '-0.51', '0.33'],
      display_name: 'Greater London, United Kingdom',
    },
  ];

  beforeEach(() => {
    provider = new OpenStreetMapProvider();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is always configured without requiring API credentials or credit cards', () => {
    expect(provider.isConfigured()).toBe(true);
    expect(provider.id).toBe('osm');
  });

  it('maps Overpass response elements accurately with addresses and coordinates', async () => {
    vi.spyOn(provider, 'geocodeBoundingBox').mockResolvedValue({
      south: 51.28,
      north: 51.69,
      west: -0.51,
      east: 0.33,
      displayName: 'London, UK',
    });
    vi.spyOn(provider, 'queryOverpass').mockResolvedValue(fixtureOverpassResponse);
    vi.spyOn(dataStore as any, 'getDiscoveryCache').mockReturnValue(null);
    const saveCacheSpy = vi.spyOn(dataStore as any, 'saveDiscoveryCache').mockImplementation(() => {});

    const leads = await provider.discover({
      market: 'UK',
      industry: 'Dental & Healthcare Clinics',
      location: 'London, UK',
      targetPipeline: 'both',
      keywords: [],
      provider: 'osm',
      limit: 10,
    });

    // 1003 is closed, 1004 has no name, 1005 is a duplicate
    expect(leads.length).toBe(2);

    const lead1 = leads[0];
    expect(lead1.name).toBe('The Baker Street Clinic');
    expect(lead1.address).toContain('221B, Baker Street');
    expect(lead1.city).toBe('London');
    expect(lead1.phone).toBe('+44 20 7946 0912');
    expect(lead1.domain).toBe('bakerstreetclinic.co.uk');
    expect(lead1.sourceProvider).toBe('OpenStreetMap');
    expect(lead1.sourceIdentifier).toBe('1001');
    expect(lead1.socialUrls).toContain('https://facebook.com/bakerclinic');
    expect(lead1.socialUrls).toContain('https://instagram.com/bakerclinic');

    expect(saveCacheSpy).toHaveBeenCalledTimes(1);
  });

  it('strictly applies honest evidence rules for leads with and without websites', async () => {
    vi.spyOn(provider, 'geocodeBoundingBox').mockResolvedValue({
      south: 51.28,
      north: 51.69,
      west: -0.51,
      east: 0.33,
      displayName: 'London, UK',
    });
    vi.spyOn(provider, 'queryOverpass').mockResolvedValue(fixtureOverpassResponse);
    vi.spyOn(dataStore as any, 'getDiscoveryCache').mockReturnValue(null);
    vi.spyOn(dataStore as any, 'saveDiscoveryCache').mockImplementation(() => {});

    const leads = await provider.discover({
      market: 'UK',
      industry: 'Dental & Healthcare Clinics',
      location: 'London, UK',
      targetPipeline: 'both',
      keywords: [],
      provider: 'osm',
      limit: 10,
    });

    const leadWithSite = leads[0];
    const siteEvidence = leadWithSite.evidence.find((e) => e.evidenceType === 'osm_website');
    expect(siteEvidence).toBeDefined();
    expect(siteEvidence?.isFactual).toBe(true);
    expect(siteEvidence?.summary).toContain('Website listed on OpenStreetMap: https://bakerstreetclinic.co.uk');

    const leadWithoutSite = leads[1];
    const noSiteEvidence = leadWithoutSite.evidence.find((e) => e.evidenceType === 'no_website_osm');
    expect(noSiteEvidence).toBeDefined();
    // Must be labeled with non-factual uncertainty, NOT as a proven fact
    expect(noSiteEvidence?.isFactual).toBe(false);
    expect(noSiteEvidence?.summary).toBe('No website listed on OpenStreetMap (check before assuming)');
  });

  it('marks OSM-extracted emails strictly as unverified', async () => {
    vi.spyOn(provider, 'geocodeBoundingBox').mockResolvedValue({
      south: 51.28,
      north: 51.69,
      west: -0.51,
      east: 0.33,
      displayName: 'London, UK',
    });
    vi.spyOn(provider, 'queryOverpass').mockResolvedValue(fixtureOverpassResponse);
    vi.spyOn(dataStore as any, 'getDiscoveryCache').mockReturnValue(null);
    vi.spyOn(dataStore as any, 'saveDiscoveryCache').mockImplementation(() => {});

    const leads = await provider.discover({
      market: 'UK',
      industry: 'Dental & Healthcare Clinics',
      location: 'London, UK',
      targetPipeline: 'both',
      keywords: [],
      provider: 'osm',
      limit: 10,
    });

    const leadWithEmail = leads[0];
    expect(leadWithEmail.contacts?.length).toBe(1);
    expect(leadWithEmail.contacts?.[0].email).toBe('reception@bakerstreetclinic.co.uk');
    // Must be unverified
    expect(leadWithEmail.contacts?.[0].verificationStatus).toBe('unverified');

    const leadWithoutEmail = leads[1];
    expect(leadWithoutEmail.contacts?.length).toBe(0);
  });

  it('filters out permanently closed establishments, unnamed entries, and duplicates', async () => {
    vi.spyOn(provider, 'geocodeBoundingBox').mockResolvedValue({
      south: 51.28,
      north: 51.69,
      west: -0.51,
      east: 0.33,
      displayName: 'London, UK',
    });
    vi.spyOn(provider, 'queryOverpass').mockResolvedValue(fixtureOverpassResponse);
    vi.spyOn(dataStore as any, 'getDiscoveryCache').mockReturnValue(null);
    vi.spyOn(dataStore as any, 'saveDiscoveryCache').mockImplementation(() => {});

    const leads = await provider.discover({
      market: 'UK',
      industry: 'Dental & Healthcare Clinics',
      location: 'London, UK',
      targetPipeline: 'both',
      keywords: [],
      provider: 'osm',
      limit: 10,
    });

    const names = leads.map((l) => l.name);
    expect(names).not.toContain('Old Closed Surgery');
    expect(names).not.toContain('');
    expect(names.filter((n) => n === 'The Baker Street Clinic').length).toBe(1);
  });

  it('returns cached results on cache hit without making network calls', async () => {
    const cachedLead = {
      name: 'Cached Dental Studio',
      country: 'UK',
      city: 'London',
      sourceProvider: 'OpenStreetMap',
      evidence: [],
    };

    vi.spyOn(dataStore as any, 'getDiscoveryCache').mockReturnValue([cachedLead as any]);
    const geocodeSpy = vi.spyOn(provider, 'geocodeBoundingBox');

    const leads = await provider.discover({
      market: 'UK',
      industry: 'Dental & Healthcare Clinics',
      location: 'London, UK',
      targetPipeline: 'both',
      keywords: [],
      provider: 'osm',
      limit: 10,
    });

    expect(leads.length).toBe(1);
    expect(leads[0].name).toBe('Cached Dental Studio');
    expect(geocodeSpy).not.toHaveBeenCalled();
  });

  it('resolves category presets correctly for target industries', () => {
    expect(resolveOsmCategoryPreset('Dental & Healthcare Clinics').id).toBe('clinics');
    expect(resolveOsmCategoryPreset('Italian Restaurant').id).toBe('restaurants');
    expect(resolveOsmCategoryPreset('Barber & Beauty Salon').id).toBe('salons');
    expect(resolveOsmCategoryPreset('Auto Repair & Mechanics').id).toBe('auto_repair');
    expect(resolveOsmCategoryPreset('Plumber and Electrician').id).toBe('contractors');
  });
});

describe('Discovery Provider Selection Logic', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to osm when GOOGLE_PLACES_API_KEY is not set', () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.DISCOVERY_PROVIDER;
    delete process.env.GEOAPIFY_API_KEY;

    const service = new DiscoveryService();
    expect(service.getActiveProviderId()).toBe('osm');
  });

  it('selects google_places when GOOGLE_PLACES_API_KEY is present and provider is auto', () => {
    process.env.GOOGLE_PLACES_API_KEY = 'AIzaSyFakeKeyPlaces';
    delete process.env.DISCOVERY_PROVIDER;

    const service = new DiscoveryService();
    expect(service.getActiveProviderId()).toBe('google_places');
  });

  it('respects DISCOVERY_PROVIDER="osm" even if GOOGLE_PLACES_API_KEY is configured', () => {
    process.env.GOOGLE_PLACES_API_KEY = 'AIzaSyFakeKeyPlaces';
    process.env.DISCOVERY_PROVIDER = 'osm';

    const service = new DiscoveryService();
    expect(service.getActiveProviderId()).toBe('osm');
  });

  it('respects DISCOVERY_PROVIDER="geoapify" when GEOAPIFY_API_KEY is set', () => {
    process.env.GEOAPIFY_API_KEY = 'geoapify-fake-key';
    process.env.DISCOVERY_PROVIDER = 'geoapify';

    const service = new DiscoveryService();
    expect(service.getActiveProviderId()).toBe('geoapify');
  });
});
