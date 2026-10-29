import { describe, it, expect } from 'vitest';
import { outreachService } from '../outreach-service';
import { BusinessEntity, GrowthEvidenceEntity, WebsiteCheckEntity, ContactEntity } from '@/types';

describe('AI Outreach Service & Structured Output Validation', () => {
  const mockBusiness: BusinessEntity = {
    id: 'b-010',
    organizationId: 'org-1',
    name: 'DocuSync Logistics Cloud',
    normalizedName: 'docusync logistics cloud',
    country: 'US',
    industry: 'Supply Chain SaaS',
    pipelineType: 'ai_software_opportunities',
    qualificationStatus: 'qualified',
    sourceProvider: 'tech_directory',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockEvidence: GrowthEvidenceEntity[] = [
    {
      id: 'e-10',
      businessId: 'b-010',
      sourceName: 'LinkedIn Job Board',
      observationTime: new Date().toISOString(),
      evidenceType: 'hiring_signal',
      summary: 'Recruiting for Senior Python Developer with RAG and vector database experience.',
      isFactual: true,
      confidence: 0.95,
      freshnessScore: 1.0,
      createdAt: new Date().toISOString(),
    },
  ];

  const mockContact: ContactEntity = {
    id: 'c-10',
    businessId: 'b-010',
    fullName: 'Alexander Wright',
    firstName: 'Alexander',
    title: 'VP of Product & Engineering',
    email: 'alex.wright@docusynclogistics.io',
    confidence: 0.95,
    verificationStatus: 'verified',
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const senderProfile = {
    name: 'Senior Full Stack AI Developer',
    title: 'AI Automation Architect & Senior Python Engineer',
    specialization: 'LLMs, RAG, Data Pipelines & Full-Stack Systems',
  };

  it('generates a strictly validated structured outreach package for AI & RAG strategy', async () => {
    const result = await outreachService.generateDraft({
      business: mockBusiness,
      evidence: mockEvidence,
      contact: mockContact,
      strategy: 'rag_systems',
      senderProfile,
    });

    const { draft } = result;

    expect(draft.subjectLines.length).toBe(3);
    expect(draft.selectedSubject).toBeDefined();
    expect(draft.emailBody.length).toBeGreaterThan(50);
    expect(draft.callToAction).toBeDefined();
    expect(draft.serviceOffer).toBeDefined();
    expect(draft.valueProposition).toBeDefined();
    expect(draft.researchSummary).toBeDefined();
    expect(draft.observations.length).toBeGreaterThanOrEqual(1);
    expect(draft.confidenceRating).toBeGreaterThanOrEqual(0.7);
    expect(draft.emailBody).toContain('Alexander');
    expect(draft.emailBody).toContain('DocuSync Logistics Cloud');
  });

  it('generates a tailored web development outreach package for local business with no website', async () => {
    const localBiz: BusinessEntity = {
      ...mockBusiness,
      name: 'Vanguard Precision HVAC',
      industry: 'HVAC Services',
      pipelineType: 'website_opportunities',
    };

    const webCheck: WebsiteCheckEntity = {
      id: 'w-10',
      businessId: 'b-010',
      status: 'apparently_absent',
      isPrivateIp: false,
      checkedAt: new Date().toISOString(),
    };

    const result = await outreachService.generateDraft({
      business: localBiz,
      evidence: mockEvidence,
      websiteCheck: webCheck,
      contact: mockContact,
      strategy: 'web_development',
      senderProfile,
    });

    const { draft } = result;
    expect(draft.subjectLines[0]).toContain('Vanguard Precision HVAC');
    expect(draft.emailBody).toContain('lacking an active web domain');
    expect(draft.serviceOffer).toContain('web development');
  });
});
