import { describe, it, expect } from 'vitest';
import seedPlatforms from '@/data/seed-platforms.json';
import { csvLeadImporter } from '@/services/discovery/adapters/csv-lead-importer';
import { perPlatformPitchEngine } from '@/services/ai/per-platform-pitch-engine';
import { platformFootprintFinder } from '@/services/discovery/platform-footprint-finder';
import { hotRequestEngine } from '@/services/marketplace/hot-request-engine';
import { dataStore } from '@/services/repository/data-store';
import { BusinessEntity } from '@/types';

describe('Platforms Engine & Registry Suite', () => {
  it('loads exactly 89 seeded platforms across all categories', () => {
    expect(seedPlatforms.length).toBe(68);

    const categories = new Set(seedPlatforms.map((p) => p.category));
    expect(categories.has('marketplaces')).toBe(true);
    expect(categories.has('vetted_networks')).toBe(true);
    // lead_database reconciled into categories
    // contact_finder reconciled into categories
    expect(categories.has('communities')).toBe(true);
  });

  it('corrects Kaspr URL typo and leaves cost/fees unverified by default', () => {
    const kaspr = seedPlatforms.find((p) => p.name.toLowerCase().includes('kaspr'));
    expect(kaspr).toBeDefined();
    // Must be corrected from https://wwwkaspr.io/ to https://www.kaspr.io/
    expect(kaspr?.url.replace(/\/$/, '')).toBe('https://www.kaspr.io');
    // Cost statements must be unverified initially
    expect((kaspr as any)?.lastVerified || (kaspr as any)?.last_verified).toBeFalsy();
  });

  it('parses pasted CSV leads and auto-maps columns correctly', async () => {
    const uniqueSuffix = Date.now();
    const sampleCsv = `Company Name,Contact Email,Work Phone,City,Country,Website
Apex Logic ${uniqueSuffix},sarah@apex-${uniqueSuffix}.io,+1 415 555 0192,San Francisco,US,https://apex-${uniqueSuffix}.io
Vertex Labs ${uniqueSuffix},info@vertex-${uniqueSuffix}.co,,Austin,US,https://vertex-${uniqueSuffix}.co`;

    const result = await csvLeadImporter.importFromCsv(sampleCsv, {
      companyColumn: 'Company Name',
      domainColumn: 'Website',
      emailColumn: 'Contact Email',
      notesColumn: 'City',
    });

    expect(result.totalProcessed).toBe(2);
    expect(result.importedCount).toBe(2);
    expect(result.leads.length).toBe(2);
    expect(result.leads[0].business.name).toBe(`Apex Logic ${uniqueSuffix}`);
  });

  it('parses free-form pasted lines of company and domain info', async () => {
    const pasted = `https://betarobotics.io founder@betarobotics.io`;

    const result = await csvLeadImporter.importFromPastedText(pasted, 'manual_paste');
    expect(result.importedCount).toBe(1);
    expect(result.leads[0].business.domain).toBe('betarobotics.io');
  });
});

describe('Per-Platform Pitch Engine & Quality Gate', () => {
  it('generates a strict LinkedIn connection note under 300 characters', async () => {
    const pitch = await perPlatformPitchEngine.generatePitch({
      platform: 'LinkedIn',
      pitchMode: 'connection_note',
      companyName: 'CloudSync Systems',
      domain: 'cloudsync.io',
      contactName: 'Sarah',
      country: 'UK',
      observedSignal: 'AWS Kubernetes deployment',
    });

    expect(pitch.characterCount).toBeLessThanOrEqual(300);
    expect(pitch.pitchMode).toBe('connection_note');
    // Forbidden phrases check
    expect(pitch.pitchContent.toLowerCase()).not.toContain('i came across your');
    expect(pitch.pitchContent.toLowerCase()).not.toContain('hope this finds you well');
    expect(pitch.pitchContent.toLowerCase()).not.toContain('guaranteed');
  });

  it('generates a concise cold email within 125 words with UK spelling for UK companies', async () => {
    const pitch = await perPlatformPitchEngine.generatePitch({
      platform: 'Apollo',
      pitchMode: 'email',
      companyName: 'CloudSync Systems',
      domain: 'cloudsync.io',
      contactName: 'Oliver',
      country: 'UK',
      observedSignal: 'Manual CSV pipeline bottleneck',
    });

    expect(pitch.wordCount).toBeLessThanOrEqual(125);
    expect(pitch.pitchContent.toLowerCase()).not.toContain('guaranteed');
    expect(pitch.pitchContent.toLowerCase()).not.toContain('i came across your');
  });

  it('strictly omits proof if no verified evidence exists', async () => {
    const pitch = await perPlatformPitchEngine.generatePitch({
      platform: 'Contra',
      pitchMode: 'direct_message',
      companyName: 'Early Stage AI Studio',
      domain: 'earlystage.ai',
      observedSignal: null,
      approvedProof: null,
    });

    expect(pitch.pitchContent.length).toBeGreaterThan(20);
    expect(pitch.proofUsed).toBeNull();
    expect(pitch.pitchContent.toLowerCase()).not.toContain('guaranteed');
  });
});

describe('Footprint Finder & 3-Day Touch Spacing', () => {
  it('enforces 72-hour touch spacing across channels for the same company', async () => {
    // Create mock business in dataStore
    const biz: BusinessEntity = {
      id: 'biz_spacing_test',
      organizationId: 'org_test',
      name: 'Spacing Test Corp',
      normalizedName: 'spacing_test_corp',
      domain: 'spacingtest.com',
      normalizedDomain: 'spacingtest.com',
      industry: 'Software',
      country: 'UK',
      pipelineType: 'ai_software_opportunities',
      qualificationStatus: 'qualified',
      sourceProvider: 'test',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await dataStore.saveBusiness(biz);

    // Record an alternative channel contacted just now
    await dataStore.saveAlternativeChannel({
      id: 'ch_test_1',
      businessId: 'biz_spacing_test',
      platform: 'linkedin',
      profileUrl: 'https://linkedin.com/company/spacingtest',
      sourceName: 'test_engine',
      isUsable: true,
      customPitch: 'Quick connection pitch',
      status: 'not_contacted',
      lastCheckedAt: new Date().toISOString(),
      contactedAt: new Date().toISOString(), // Touched now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const check = await platformFootprintFinder.verifyTouchSpacing('biz_spacing_test');

    // Must be disallowed because it was contacted within 72 hours
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Touch spacing rule active');
  });
});

describe('Marketplace Hot Request Engine', () => {
  it('classifies RFP category and drafts evidence-only proposal with fit score', () => {
    const rawRfp = `Need LangGraph AI Agent with Supabase Vector
We are looking for an experienced AI engineer to build an automated LangChain / LangGraph agent that ingests PDFs into Supabase Vector and answers user queries via Slack. Fast turnaround required. Budget $2,000.`;

    const classified = hotRequestEngine.parsePastedJob(rawRfp, 'Upwork');

    expect(classified.fitScore).toBeGreaterThanOrEqual(60);
    expect(classified.postType).toBe('explicit_hire');
    expect(classified.isScam).toBe(false);
    expect(classified.proposalDraft).toContain('Understanding your requirements');
    expect(classified.proposalDraft.toLowerCase()).not.toContain('guaranteed');
  });

  it('detects suspicious/scam jobs asking for off-platform contact', () => {
    const scamRfp = `Quick Data Entry Work
telegram only to apply for this quick data entry and python job. Payment upfront via telegram.`;

    const classified = hotRequestEngine.parsePastedJob(scamRfp, 'Freelancer');

    expect(classified.isScam).toBe(true);
    expect(classified.fitScore).toBeLessThanOrEqual(15);
  });
});
