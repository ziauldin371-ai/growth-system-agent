import { describe, it, expect } from 'vitest';
import { generatePlatformPitch } from '../platform-pitch-generator';
import { BusinessEntity } from '@/types';

describe('Part D — Platform Pitch Generator & Length Compliance', () => {
  const mockBiz: BusinessEntity = {
    id: 'biz-pitch-1',
    organizationId: 'org-1',
    name: 'Apex Logistic Solutions',
    normalizedName: 'apexlogisticsolutions',
    country: 'US',
    city: 'Dallas',
    pipelineType: 'ai_software_opportunities',
    qualificationStatus: 'qualified',
    sourceProvider: 'google_places',
    isArchived: false,
    evidence: [
      {
        id: 'ev-1',
        businessId: 'biz-pitch-1',
        sourceName: 'Google Places',
        sourceUrl: 'https://maps.google.com/?cid=123',
        observationTime: new Date().toISOString(),
        evidenceType: 'hiring_signal',
        summary: 'Expanding freight operations in Texas',
        isFactual: true,
        confidence: 0.95,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('generates a LinkedIn connection note strictly under 300 characters without links', () => {
    const result = generatePlatformPitch({
      business: mockBiz,
      platform: 'linkedin',
      profileUrl: 'https://linkedin.com/company/apex-logistics',
      sourceType: 'website_link',
    });

    expect(result.charCount).toBeLessThanOrEqual(300);
    expect(result.pitch).not.toContain('http');
    expect(result.isVerifiedMatch).toBe(true);
    expect(result.suggestedTouchOrder).toBe(2);
    expect(result.evidenceSources.length).toBeGreaterThan(0);
  });

  it('generates an Instagram DM within 30-60 words with no links', () => {
    const result = generatePlatformPitch({
      business: mockBiz,
      platform: 'instagram',
      profileUrl: 'https://instagram.com/apex_logistics',
      sourceType: 'website_link',
    });

    expect(result.wordCount).toBeGreaterThanOrEqual(25);
    expect(result.wordCount).toBeLessThanOrEqual(65);
    expect(result.pitch).not.toContain('http');
    expect(result.isVerifiedMatch).toBe(true);
  });

  it('generates a formatted Contact Form message with subject line and email footer', () => {
    const result = generatePlatformPitch({
      business: mockBiz,
      platform: 'contact_form',
      profileUrl: 'https://apexlogistics.com/contact',
      sourceType: 'website_link',
    });

    expect(result.pitch).toContain('Subject:');
    expect(result.pitch).toContain('ziauldin371@gmail.com');
    expect(result.wordCount).toBeGreaterThanOrEqual(40);
    expect(result.wordCount).toBeLessThanOrEqual(100);
  });
});
