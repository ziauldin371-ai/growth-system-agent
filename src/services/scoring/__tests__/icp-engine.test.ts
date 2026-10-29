import { describe, it, expect } from 'vitest';
import { icpEngine } from '../icp-engine';
import { BusinessEntity, GrowthEvidenceEntity, WebsiteCheckEntity, ContactEntity } from '@/types';

describe('ICP Scoring Engine', () => {
  it('correctly qualifies an active business without a website into Pipeline A (Website Opportunities)', () => {
    const business: BusinessEntity = {
      id: 'b-001',
      organizationId: 'org-1',
      name: 'Vanguard Precision HVAC',
      normalizedName: 'vanguard precision hvac',
      country: 'US',
      city: 'Austin',
      industry: 'HVAC & Facilities',
      pipelineType: 'unassigned',
      qualificationStatus: 'unreviewed',
      sourceProvider: 'google_places',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const evidence: GrowthEvidenceEntity[] = [
      {
        id: 'e-1',
        businessId: 'b-001',
        sourceName: 'Commercial Register',
        observationTime: new Date().toISOString(),
        evidenceType: 'commercial_registration',
        summary: 'Active business registration in Travis County.',
        isFactual: true,
        confidence: 0.95,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'e-2',
        businessId: 'b-001',
        sourceName: 'Google Reviews',
        observationTime: new Date().toISOString(),
        evidenceType: 'customer_review_velocity',
        summary: '48 verified reviews with 4.8 stars.',
        isFactual: true,
        confidence: 0.90,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
    ];

    const websiteCheck: WebsiteCheckEntity = {
      id: 'w-1',
      businessId: 'b-001',
      status: 'apparently_absent',
      isPrivateIp: false,
      checkedAt: new Date().toISOString(),
    };

    const contacts: ContactEntity[] = [
      {
        id: 'c-1',
        businessId: 'b-001',
        fullName: 'Marcus Vance',
        title: 'Managing Partner',
        email: 'marcus@vanguardhvac.internal',
        phone: '+15125550142',
        confidence: 0.90,
        verificationStatus: 'verified',
        isPrimary: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = icpEngine.evaluateLead({
      business,
      evidence,
      websiteCheck,
      contacts,
    });

    expect(result.targetPipeline).toBe('website_opportunities');
    expect(result.websiteOpportunityScore).toBeGreaterThanOrEqual(85);
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.reasoning).toContain('Pipeline A (Website Opportunities)');
    expect(result.reasoning).toContain('apparently_absent');
  });

  it('correctly qualifies a tech company with AI/RAG hiring signals into Pipeline B (AI & Software Opportunities)', () => {
    const business: BusinessEntity = {
      id: 'b-002',
      organizationId: 'org-1',
      name: 'DocuSync Logistics Cloud',
      normalizedName: 'docusync logistics cloud',
      domain: 'docusynclogistics.io',
      country: 'US',
      city: 'Chicago',
      industry: 'Supply Chain SaaS',
      pipelineType: 'unassigned',
      qualificationStatus: 'unreviewed',
      sourceProvider: 'tech_directory',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const evidence: GrowthEvidenceEntity[] = [
      {
        id: 'e-3',
        businessId: 'b-002',
        sourceName: 'LinkedIn Jobs',
        observationTime: new Date().toISOString(),
        evidenceType: 'hiring_signal',
        summary: 'Actively hiring Senior Python Engineer for RAG, LangChain and automated document intelligence.',
        isFactual: true,
        confidence: 0.95,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'e-4',
        businessId: 'b-002',
        sourceName: 'TechCrunch',
        observationTime: new Date().toISOString(),
        evidenceType: 'funding_and_expansion',
        summary: 'Closed $2.8M Seed round to expand automated freight document parsing.',
        isFactual: true,
        confidence: 0.98,
        freshnessScore: 1.0,
        createdAt: new Date().toISOString(),
      },
    ];

    const websiteCheck: WebsiteCheckEntity = {
      id: 'w-2',
      businessId: 'b-002',
      domain: 'docusynclogistics.io',
      status: 'functional',
      httpStatusCode: 200,
      isPrivateIp: false,
      checkedAt: new Date().toISOString(),
    };

    const result = icpEngine.evaluateLead({
      business,
      evidence,
      websiteCheck,
      contacts: [],
    });

    expect(result.targetPipeline).toBe('ai_software_opportunities');
    expect(result.primaryIcpSlug).toBe('ai-llm-rag-integrations');
    expect(result.aiOpportunityScore).toBeGreaterThanOrEqual(70);
    expect(result.overallScore).toBeGreaterThanOrEqual(60);
    expect(result.reasoning).toContain('Pipeline B (AI & Software Opportunities)');
    expect(result.scoreBreakdown.matchedAiSignals).toContain('rag');
  });
});
