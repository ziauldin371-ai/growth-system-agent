import { describe, it, expect } from 'vitest';
import { generateLoomVideoScript, identifyDecisionMakerAngle, getObjectionPlaybookReply, getCompetitorAwareInsight } from '../power-tools';
import { BusinessEntity } from '@/types';

describe('Part E — Power Modules & Strategy Accelerators', () => {
  const sampleBiz: BusinessEntity = {
    id: 'biz-pow-1',
    organizationId: 'org-test',
    name: 'Precision Legal Consulting',
    normalizedName: 'precisionlegalconsulting',
    country: 'UK',
    city: 'London',
    industry: 'Legal Services',
    pipelineType: 'ai_software_opportunities',
    qualificationStatus: 'qualified',
    sourceProvider: 'uk_companies_house',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('generates a 60-second Loom script tailored to business signals', () => {
    const script = generateLoomVideoScript({
      business: sampleBiz,
      offerTitle: 'Custom Document Search & RAG System',
      observationPoint: 'New incorporation in London with active compliance filings',
    });

    expect(script.durationEstimateSeconds).toBeLessThanOrEqual(90);
    expect(script.talkingPoints.length).toBe(4);
    expect(script.talkingPoints[0].script).toContain('Precision Legal Consulting');
    expect(script.talkingPoints[2].script).toContain('Custom Document Search & RAG System');
  });

  it('identifies decision-maker angles for CTO vs Operations vs Owner', () => {
    const ctoAngle = identifyDecisionMakerAngle('Chief Technology Officer');
    expect(ctoAngle.role).toBe('cto');
    expect(ctoAngle.primaryValueProposition).toContain('RAG pipelines');

    const opsAngle = identifyDecisionMakerAngle('VP of Operations');
    expect(opsAngle.role).toBe('operations');
    expect(opsAngle.tailoredHook).toContain('repetitive manual data entry');

    const ownerAngle = identifyDecisionMakerAngle('Founder & Managing Director');
    expect(ownerAngle.role).toBe('owner');
  });

  it('provides respectful, compliant objection replies for all standard scenarios', () => {
    const timingReply = getObjectionPlaybookReply('timing');
    expect(timingReply.body).toContain('60–90 days');
    expect(timingReply.nextStepRecommendation).toContain('Nurture');

    const notInterestedReply = getObjectionPlaybookReply('not_interested');
    expect(notInterestedReply.body).toContain('removed your details');
    expect(notInterestedReply.nextStepRecommendation).toContain('suppression');
  });

  it('returns competitor-aware public insight without scare tactics', () => {
    const insight = getCompetitorAwareInsight(sampleBiz);
    expect(insight).toContain('AI agent workflows');
  });
});
