import { describe, it, expect } from 'vitest';
import {
  CLIENT_PLATFORMS,
  LOCAL_BUSINESS_CHANNELS,
  TOTAL_CLIENT_PLATFORMS,
  TOTAL_LOCAL_CHANNELS,
  getPlatformById,
  getPlatformsByGroup,
} from '@/data/platforms-registry';
import {
  generatePlatformPitch,
  FORBIDDEN_WORDS,
  DEFAULT_OPERATOR_PROFILE,
  OperatorProfile,
} from '@/services/ai/platform-pitch-templates';
import { dataStore } from '@/services/repository/data-store';

describe('Platforms Registry (68 Platforms + 7 Local Channels)', () => {
  it('contains exactly 68 platforms across Groups A through H', () => {
    expect(CLIENT_PLATFORMS.length).toBe(68);
    expect(TOTAL_CLIENT_PLATFORMS).toBe(68);
  });

  it('contains exactly 7 local channels in Group I', () => {
    expect(LOCAL_BUSINESS_CHANNELS.length).toBe(7);
    expect(TOTAL_LOCAL_CHANNELS).toBe(7);
  });

  it('verifies platform distribution per group A-H matches the reconciled registry', () => {
    const counts: Record<string, number> = {};
    for (const p of CLIENT_PLATFORMS) {
      counts[p.group] = (counts[p.group] || 0) + 1;
    }

    // Group A: General Freelance Marketplaces (14)
    expect(counts['A']).toBe(14);
    // Group B: Vetted Talent Networks (13)
    expect(counts['B']).toBe(13);
    // Group C: Specialized AI & Machine Learning (3)
    expect(counts['C']).toBe(3);
    // Group D: Automation / No-Code / Web Ecosystem Directories (7)
    expect(counts['D']).toBe(7);
    // Group E: Lead Databases and Contact Finders (12)
    expect(counts['E']).toBe(12);
    // Group F: Company Research and Directories (13)
    expect(counts['F']).toBe(13);
    // Group G: Tech Communities & Social Channels (3)
    expect(counts['G']).toBe(3);
    // Group H: Cold Email & Pipeline Reference (3)
    expect(counts['H']).toBe(3);

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(68);
  });

  it('ensures every platform has a unique id and a valid https:// officialUrl', () => {
    const ids = new Set<string>();
    for (const p of CLIENT_PLATFORMS) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.officialUrl).toMatch(/^https:\/\//);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.pitchType).toBeDefined();
      expect(p.howClientsFound.length).toBeGreaterThan(0);
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('retrieves platform by id correctly', () => {
    const upwork = getPlatformById('upwork');
    expect(upwork).toBeDefined();
    expect(upwork?.name).toBe('Upwork');
    expect(upwork?.group).toBe('A');

    const toptal = getPlatformById('toptal');
    expect(toptal).toBeDefined();
    expect(toptal?.group).toBe('B');
  });

  it('verifies exact platform names match required specifications for Groups D, E, and F', () => {
    const groupDNames = getPlatformsByGroup('D').map((p) => p.name);
    expect(groupDNames).toEqual([
      'Make Partners Directory',
      'Zapier Expert Directory',
      'n8n',
      'Webflow Experts',
      'Shopify Partners',
      'HubSpot Solutions Directory',
      'Bubble',
    ]);

    const groupENames = getPlatformsByGroup('E').map((p) => p.name);
    expect(groupENames).toEqual([
      'Apollo',
      'Clay',
      'Hunter',
      'Snov',
      'LinkedIn Sales Navigator',
      'Lusha',
      'RocketReach',
      'LeadIQ',
      'Seamless.AI',
      'UpLead',
      'Kaspr',
      'Findymail',
    ]);

    const groupFNames = getPlatformsByGroup('F').map((p) => p.name);
    expect(groupFNames).toEqual([
      'Crunchbase',
      'Clutch',
      'GoodFirms',
      'G2',
      'BuiltWith',
      'Wappalyzer',
      'DesignRush',
      'Sortlist',
      'The Manifest',
      'UpCity',
      'Wellfound',
      'Product Hunt',
      'Y Combinator Work at a Startup',
    ]);
  });

  it('filters platforms by group correctly', () => {
    const groupD = getPlatformsByGroup('D');
    expect(groupD.length).toBe(7);
    expect(groupD.every((p) => p.group === 'D')).toBe(true);
  });
});

describe('Platform Pitch Generator & Quality Gates', () => {
  it('generates proposal pitch with yellow warning when profile lacks portfolio', () => {
    const upwork = getPlatformById('upwork')!;
    const profileWithoutPortfolio: OperatorProfile = {
      name: 'Zia Ul Din',
      headline: 'Full Stack & AI Engineer',
      services: 'AI automation workflows, LLM apps, Next.js',
      portfolioLinks: [], // Empty portfolio
      bio: 'Building reliable automated systems',
      rateRange: '$40/hr',
      availability: '20 hrs/week',
      languages: 'English',
      timezone: 'PKT',
    };

    const pitch = generatePlatformPitch(upwork, profileWithoutPortfolio);

    expect(pitch.missingFields).toContain('portfolio_links');
    expect(pitch.text).toContain('Zia Ul Din');
    expect(pitch.characterCount).toBeGreaterThan(50);
  });

  it('omits portfolio warning when portfolio links are present', () => {
    const toptal = getPlatformById('toptal')!;
    const profileWithPortfolio: OperatorProfile = {
      name: 'Zia Ul Din',
      headline: 'Senior AI Engineer',
      services: 'Machine learning & AI agent architecture',
      portfolioLinks: ['https://github.com/ziauldin371-ai/growth-system-agent'],
      bio: 'Production AI engineer',
      rateRange: '$50/hr',
      availability: '25 hrs/week',
      languages: 'English',
      timezone: 'PKT',
    };

    const pitch = generatePlatformPitch(toptal, profileWithPortfolio);

    expect(pitch.missingFields).not.toContain('portfolio_links');
    expect(pitch.text).toContain('https://github.com/ziauldin371-ai/growth-system-agent');
  });

  it('strictly contains zero forbidden phrases across all pitch types', () => {
    for (const platform of CLIENT_PLATFORMS) {
      const pitch = generatePlatformPitch(platform, DEFAULT_OPERATOR_PROFILE);

      const lower = pitch.text.toLowerCase();
      for (const phrase of FORBIDDEN_WORDS) {
        expect(lower.includes(phrase.toLowerCase())).toBe(false);
      }
    }
  });

  it('keeps proposals concise under 250 words', () => {
    const upwork = getPlatformById('upwork')!;
    const pitch = generatePlatformPitch(upwork, DEFAULT_OPERATOR_PROFILE);
    expect(pitch.wordCount).toBeLessThanOrEqual(250);
  });
});

describe('Platform Tracker & Profile DataStore Methods', () => {
  it('saves and reads platform tracking records', async () => {
    const tracker = await dataStore.savePlatformTracker({
      platformId: 'upwork',
      status: 'proposals_sent',
      myProfileUrl: 'https://upwork.com/freelancers/~0123456789',
      notes: 'Submitted 3 proposals today',
      checklist: { headline: true, portfolio: true },
    });

    expect(tracker.platformId).toBe('upwork');
    expect(tracker.status).toBe('proposals_sent');
    expect(tracker.checklist?.portfolio).toBe(true);

    const loaded = await dataStore.getPlatformTracker('upwork');
    expect(loaded).toBeDefined();
    expect(loaded?.status).toBe('proposals_sent');
    expect(loaded?.notes).toBe('Submitted 3 proposals today');

    const allTrackers = await dataStore.getPlatformTrackers();
    expect(allTrackers['upwork']).toBeDefined();
  });

  it('increments and tracks daily proposal target', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const initial = await dataStore.getDailyTarget(today);
    expect(initial.targetCount).toBe(5);

    const incremented = await dataStore.incrementDailyProposals(today);
    expect(incremented.completedCount).toBeGreaterThanOrEqual(1);

    const reloaded = await dataStore.getDailyTarget(today);
    expect(reloaded.completedCount).toBe(incremented.completedCount);
  });

  it('saves and loads operator profile', async () => {
    const profile = await dataStore.saveOperatorProfile({
      name: 'Zia Ul Din',
      headline: 'Full Stack & AI Engineer',
      bio: 'Crafting production software',
      rateRange: '$45/hr',
      services: 'Full Stack Web, AI Automation',
      portfolioLinks: ['https://growth-system-agent-brown.vercel.app'],
      languages: 'English',
      availability: '30 hrs/week',
      timezone: 'PKT',
    });

    expect(profile.name).toBe('Zia Ul Din');
    expect(profile.rateRange).toBe('$45/hr');

    const loaded = await dataStore.getOperatorProfile();
    expect(loaded?.name).toBe('Zia Ul Din');
    expect(loaded?.services).toContain('AI Automation');
  });
});
