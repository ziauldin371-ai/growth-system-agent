import { BusinessEntity, GrowthEvidenceEntity, WebsiteCheckEntity, ContactEntity, LeadScoreEntity } from '@/types';

export interface ScoreLeadInput {
  business: BusinessEntity;
  evidence: GrowthEvidenceEntity[];
  websiteCheck?: WebsiteCheckEntity | null;
  contacts?: ContactEntity[];
}

export interface ScoredLeadResult {
  overallScore: number;
  activityScore: number;
  serviceFitScore: number;
  websiteOpportunityScore: number;
  aiOpportunityScore: number;
  contactQualityScore: number;
  confidenceScore: number;
  targetPipeline: 'website_opportunities' | 'ai_software_opportunities';
  primaryIcpSlug: string;
  reasoning: string;
  scoreBreakdown: Record<string, any>;
}

export class ICPEngine {
  /**
   * Evaluates freshness score based on observation timestamp (decay over 180 days).
   */
  private calculateFreshness(observationTime: string): number {
    const ageDays = (Date.now() - new Date(observationTime).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) return 1.0;
    if (ageDays <= 90) return 0.85;
    if (ageDays <= 180) return 0.65;
    return 0.40;
  }

  /**
   * Main scoring function for a prospective business lead.
   */
  public evaluateLead(input: ScoreLeadInput): ScoredLeadResult {
    const { business, evidence = [], websiteCheck, contacts = [] } = input;

    // 1. Calculate Activity Score (0-100)
    let activityScore = 0;
    const verifiedEvidence = evidence.filter(e => e.isFactual);
    const hasRegistry = evidence.some(e => e.evidenceType.includes('registration') || e.evidenceType.includes('statutory') || e.evidenceType.includes('filing'));
    const hasReviews = evidence.some(e => e.evidenceType.includes('review'));
    const hasHiring = evidence.some(e => e.evidenceType.includes('hiring'));
    const hasFundingOrLaunch = evidence.some(e => e.evidenceType.includes('funding') || e.evidenceType.includes('launch'));

    if (hasRegistry) activityScore += 35;
    if (hasReviews) activityScore += 25;
    if (hasHiring) activityScore += 25;
    if (hasFundingOrLaunch) activityScore += 15;
    activityScore = Math.min(100, Math.max(activityScore, verifiedEvidence.length * 20));

    // 2. Calculate Website Opportunity Score (0-100)
    let websiteOpportunityScore = 0;
    const webStatus = websiteCheck?.status || 'apparently_absent';

    if (webStatus === 'apparently_absent') {
      websiteOpportunityScore = 95;
    } else if (webStatus === 'social_only') {
      websiteOpportunityScore = 90;
    } else if (webStatus === 'parked') {
      websiteOpportunityScore = 85;
    } else if (webStatus === 'broken') {
      websiteOpportunityScore = 75;
    } else if (webStatus === 'inconclusive') {
      websiteOpportunityScore = 30; // Conservative to avoid false opportunities
    } else if (webStatus === 'functional') {
      websiteOpportunityScore = 10; // Already has working website
    }

    // 3. Calculate AI & Automation Opportunity Score (0-100)
    let aiOpportunityScore = 0;
    const aiKeywords = [
      'ai', 'llm', 'rag', 'langchain', 'vector', 'automation', 'document intelligence',
      'fastapi', 'python', 'etl', 'pipeline', 'workflow', 'scraping', 'data science',
      'machine learning', 'analytics', 'bot', 'chat'
    ];

    const evidenceText = evidence.map(e => `${e.summary} ${e.evidenceType}`).join(' ').toLowerCase();
    const industryText = (business.industry || '').toLowerCase();
    const matchedAiKeywords = aiKeywords.filter(kw => evidenceText.includes(kw) || industryText.includes(kw));

    if (matchedAiKeywords.length > 0) {
      aiOpportunityScore = Math.min(95, 40 + matchedAiKeywords.length * 15);
    } else if (['saas', 'software', 'technology', 'agency', 'logistics', 'fintech', 'healthtech'].some(i => industryText.includes(i))) {
      aiOpportunityScore = 45; // Industry affinity but no explicit technical signal yet
    } else {
      aiOpportunityScore = 15; // Low or unknown AI demand
    }

    // 4. Calculate Contact Quality Score (0-100)
    let contactQualityScore = 20; // baseline
    if (contacts.length > 0) {
      const primary = contacts.find(c => c.isPrimary) || contacts[0];
      if (primary.email && primary.verificationStatus === 'verified') contactQualityScore += 40;
      if (primary.phone) contactQualityScore += 20;
      if (primary.linkedinUrl) contactQualityScore += 10;
      if (primary.title && /founder|ceo|cto|owner|director|head|vp/i.test(primary.title)) {
        contactQualityScore += 10;
      }
    } else if (business.phone) {
      contactQualityScore += 25;
    }
    contactQualityScore = Math.min(100, contactQualityScore);

    // 5. Evidence Confidence & Freshness Score (0.00 - 1.00)
    let totalConfidenceWeight = 0;
    let confidenceSum = 0;
    if (evidence.length === 0) {
      confidenceSum = 0.40;
      totalConfidenceWeight = 1.0;
    } else {
      for (const ev of evidence) {
        const freshness = this.calculateFreshness(ev.observationTime);
        const weight = ev.isFactual ? 1.0 : 0.6;
        confidenceSum += ev.confidence * freshness * weight;
        totalConfidenceWeight += weight;
      }
    }
    const confidenceScore = Number((confidenceSum / totalConfidenceWeight).toFixed(2));

    // 6. Determine Pipeline Assignment & Service Fit Score
    // Decision logic: If website is absent/social_only/parked and business is local trade/services -> Pipeline A
    // If business is software/tech/SaaS/agency/data or explicit AI/Python signals detected -> Pipeline B
    let targetPipeline: 'website_opportunities' | 'ai_software_opportunities';
    let serviceFitScore = 0;
    let primaryIcpSlug = '';
    let overallScore = 0;
    let reasoning = '';

    const hasStrongAiSignals = aiOpportunityScore >= 60;
    const isTechOrAgency = ['saas', 'software', 'agency', 'tech'].some(t => industryText.includes(t));

    if ((webStatus === 'apparently_absent' || webStatus === 'social_only' || webStatus === 'parked') && !hasStrongAiSignals && !isTechOrAgency) {
      targetPipeline = 'website_opportunities';
      primaryIcpSlug = webStatus === 'social_only' ? 'local-business-social-only' : 'local-business-no-website';
      serviceFitScore = Math.round((websiteOpportunityScore * 0.6) + (activityScore * 0.4));
      
      // Pipeline A Overall Score Weighting:
      // 40% website gap, 30% verified business activity, 20% contact quality, 10% confidence
      overallScore = Math.round(
        (websiteOpportunityScore * 0.40) +
        (activityScore * 0.30) +
        (contactQualityScore * 0.20) +
        ((confidenceScore * 100) * 0.10)
      );

      reasoning = `Qualified for Pipeline A (Website Opportunities). Business displays verified commercial activity (${verifiedEvidence.length} source signals) but website status is "${webStatus}". High conversion potential for modern responsive website, automated appointment booking, and local search presence.`;
    } else {
      targetPipeline = 'ai_software_opportunities';
      
      if (evidenceText.includes('rag') || evidenceText.includes('llm') || evidenceText.includes('vector')) {
        primaryIcpSlug = 'ai-llm-rag-integrations';
      } else if (evidenceText.includes('hiring') || evidenceText.includes('recruiting')) {
        primaryIcpSlug = 'public-hiring-signals';
      } else if (industryText.includes('agency')) {
        primaryIcpSlug = 'agency-white-label-partner';
      } else if (evidenceText.includes('pipeline') || evidenceText.includes('data') || evidenceText.includes('analytics')) {
        primaryIcpSlug = 'data-engineering-analytics';
      } else {
        primaryIcpSlug = 'saas-mvp-engineering-capacity';
      }

      serviceFitScore = Math.round((aiOpportunityScore * 0.65) + (activityScore * 0.35));

      // Pipeline B Overall Score Weighting:
      // 45% AI/software demand signals, 25% service fit, 15% contact quality, 15% confidence
      overallScore = Math.round(
        (aiOpportunityScore * 0.45) +
        (serviceFitScore * 0.25) +
        (contactQualityScore * 0.15) +
        ((confidenceScore * 100) * 0.15)
      );

      reasoning = `Qualified for Pipeline B (AI & Software Opportunities). Matched profile "${primaryIcpSlug}". Documented evidence shows technical activity or modernization demand (${matchedAiKeywords.join(', ') || 'software operations'}). Strong opportunity for senior LLM/RAG integration, Python backend engineering, or automated data workflows.`;
    }

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      activityScore,
      serviceFitScore,
      websiteOpportunityScore,
      aiOpportunityScore,
      contactQualityScore,
      confidenceScore,
      targetPipeline,
      primaryIcpSlug,
      reasoning,
      scoreBreakdown: {
        verifiedEvidenceCount: verifiedEvidence.length,
        hasOfficialRegistry: hasRegistry,
        websiteStatus: webStatus,
        matchedAiSignals: matchedAiKeywords,
        confidenceFreshness: confidenceScore,
      },
    };
  }
}

export const icpEngine = new ICPEngine();
