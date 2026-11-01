import { describe, it, expect } from 'vitest';
import { OpenStreetMapProvider } from '../providers/open-street-map-provider';

describe('OpenStreetMapProvider Live Integration Test', () => {
  it('discovers 5 real businesses in London, UK with fair-use & honesty rules', async () => {
    const provider = new OpenStreetMapProvider();
    const results = await provider.discover({
      market: 'UK',
      industry: 'Dental & Healthcare Clinics',
      location: 'London, UK',
      targetPipeline: 'both',
      keywords: ['dentists'],
      provider: 'osm',
      limit: 5,
    });

    console.log('LIVE_TEST_RESULT_COUNT:', results.length);
    results.forEach((r, idx) => {
      const contact = r.contacts?.[0];

      console.log('LIVE_LEAD_' + (idx + 1) + ':', JSON.stringify({
        name: r.name,
        city: r.city,
        country: r.country,
        category: r.industry,
        source: r.sourceProvider,
        phone: r.phone || 'None',
        website: r.domain ? `https://${r.domain}` : 'None',
        email: contact?.email || 'None',
        verificationStatus: contact?.verificationStatus || 'none',
        osmId: r.sourceIdentifier,
        evidenceSummary: r.evidence?.[0]?.summary,
        isFactual: r.evidence?.[0]?.isFactual,
        attribution: r.rawPayloadRef?.attribution
      }, null, 2));
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);

    for (const lead of results) {
      expect(lead.name).toBeTruthy();
      expect(lead.sourceProvider).toBe('OpenStreetMap');
      expect(lead.rawPayloadRef?.attribution).toBe('Data © OpenStreetMap contributors (ODbL)');
      if (lead.contacts && lead.contacts.length > 0) {
        expect(lead.contacts[0].verificationStatus).toBe('unverified');
      }
      if (!lead.domain) {
        const noWeb = lead.evidence.find(e => e.evidenceType === 'no_website_osm');
        expect(noWeb).toBeDefined();
        expect(noWeb?.isFactual).toBe(false);
        expect(noWeb?.summary).toBe('No website listed on OpenStreetMap (check before assuming)');
      }
    }
  }, 30000);
});
