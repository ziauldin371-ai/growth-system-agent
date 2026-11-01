import { describe, it, expect } from 'vitest';
import { SEED_LEAD_SOURCES } from '@/data/lead-sources-registry';

describe('Tier A Connectors & Strict Manual-Only Platform Guards', () => {
  it('guarantees manual-only platforms have method manual_capture or link_only', () => {
    const manualOnlyDomains = [
      'upwork.com',
      'contra.com',
      'wellfound.com',
      'toptal.com',
      'catalant.com',
      'linkedin.com',
      'reddit.com',
    ];

    for (const domain of manualOnlyDomains) {
      const source = SEED_LEAD_SOURCES.find(s => s.domain === domain || s.id.includes(domain.split('.')[0]));
      expect(source).toBeDefined();
      expect(source?.accessTier).not.toBe('tier_a_auto');
      expect(['manual_capture', 'link_only', 'excluded']).toContain(source?.method);
    }
  });

  it('verifies Tier A automatic sources use official APIs or public RSS feeds', () => {
    const tierASources = SEED_LEAD_SOURCES.filter(s => s.accessTier === 'tier_a_auto');
    expect(tierASources.length).toBeGreaterThanOrEqual(5);

    for (const src of tierASources) {
      expect(['official_api', 'public_rss']).toContain(src.method);
      expect(src.status).toBe('verified_api');
    }
  });

  it('strictly excludes expert networks from general outreach', () => {
    const expertNetworks = SEED_LEAD_SOURCES.filter(s => s.accessTier === 'expert_network_excluded');
    expect(expertNetworks.length).toBeGreaterThanOrEqual(3);

    for (const net of expertNetworks) {
      expect(net.method).toBe('excluded');
      expect(net.category).toBe('expert_network');
    }
  });
});
