import { BusinessEntity } from '@/types';

export interface LoomVideoScript {
  title: string;
  durationEstimateSeconds: number;
  talkingPoints: Array<{
    timestamp: string;
    action: string;
    script: string;
  }>;
}

export interface DecisionMakerAngle {
  role: 'owner' | 'cto' | 'operations' | 'marketing' | 'general';
  tailoredHook: string;
  primaryValueProposition: string;
}

/**
 * Generates a concise 60-second personalized Loom video outline for high-value leads.
 * Zia records these manually — 100% human-recorded, high-conversion asset.
 */
export function generateLoomVideoScript(params: {
  business: BusinessEntity;
  offerTitle: string;
  observationPoint: string;
}): LoomVideoScript {
  const { business, offerTitle, observationPoint } = params;

  return {
    title: `60-Second Video Audit for ${business.name}`,
    durationEstimateSeconds: 65,
    talkingPoints: [
      {
        timestamp: '0:00 - 0:10',
        action: `Show ${business.name} public profile or website on screen`,
        script: `Hi ${business.name} team, Zia here. I was reviewing growing businesses in ${business.city || 'your area'} and noticed ${observationPoint.toLowerCase().replace(/\.$/, '')}.`,
      },
      {
        timestamp: '0:10 - 0:30',
        action: 'Highlight the specific bottleneck or opportunity area',
        script: `When companies reach your scale, manual coordination often bottlenecks capacity. For instance, without automated booking or integrated workflow logic, teams spend 10+ hours weekly on back-and-forth communication.`,
      },
      {
        timestamp: '0:30 - 0:50',
        action: 'Show a 10-second diagram of the proposed solution architecture',
        script: `As a Full Stack AI Developer & Automation Architect, I build turnkey ${offerTitle} that automate this end-to-end, typically live in under two weeks.`,
      },
      {
        timestamp: '0:50 - 1:05',
        action: 'Direct to soft call-to-action',
        script: `No pressure at all — if you would like me to share the 1-page architecture schematic, just reply to my email and I'll send it over. Thanks for your time!`,
      },
    ],
  };
}

/**
 * Tailors outreach angles based on the prospective decision-maker's role.
 */
export function identifyDecisionMakerAngle(roleTitle?: string | null): DecisionMakerAngle {
  const lower = (roleTitle || '').toLowerCase();

  if (/\bcto\b/.test(lower) || lower.includes('tech') || lower.includes('engineer') || lower.includes('architect')) {
    return {
      role: 'cto',
      tailoredHook: 'Engineering bandwidth and custom AI/Python infrastructure',
      primaryValueProposition: 'I act as an elite overflow implementation partner, delivering production-ready RAG pipelines, FastAPI services, and clean TypeScript modules with zero onboarding friction.',
    };
  }

  if (lower.includes('operat') || lower.includes('coo') || lower.includes('logistics') || lower.includes('project')) {
    return {
      role: 'operations',
      tailoredHook: 'Eliminating repetitive manual data entry and workflow friction',
      primaryValueProposition: 'I automate cross-platform workflows, syncing your CRM, booking systems, and databases with automated notifications so your operations run without human intervention.',
    };
  }

  if (lower.includes('market') || lower.includes('cmo') || lower.includes('growth')) {
    return {
      role: 'marketing',
      tailoredHook: 'High-converting digital presence and automated lead qualification',
      primaryValueProposition: 'I build modern web experiences with sub-second page loads and conversational AI assistants that capture and qualify leads 24/7.',
    };
  }

  return {
    role: 'owner',
    tailoredHook: 'Direct ROI and freeing up executive leadership time',
    primaryValueProposition: 'I deliver productized technology sprints with clear timelines, transparent deliverables, and zero technical jargon, directly increasing your team’s operating efficiency.',
  };
}

/**
 * Returns competitor-aware insight synthesized strictly from public regional signals.
 */
export function getCompetitorAwareInsight(business: BusinessEntity): string {
  if (business.pipelineType === 'website_opportunities') {
    return `Most peer establishments in ${business.city || business.country} now offer direct mobile scheduling, capturing customers outside regular operating hours.`;
  }
  return `Leading companies in ${business.industry || 'your industry'} are increasingly adopting custom AI agent workflows to resolve routine client inquiries without increasing headcount.`;
}

/**
 * Suggests battle-tested objection responses for operator review and approval.
 */
export function getObjectionPlaybookReply(objectionType: 'price' | 'timing' | 'have_vendor' | 'send_info' | 'not_interested'): {
  subject: string;
  body: string;
  nextStepRecommendation: string;
} {
  switch (objectionType) {
    case 'price':
      return {
        subject: 'Re: Project scope and flexibility',
        body: `Hi [Name],\n\nCompletely understand that budget needs to align with immediate business return.\n\nBecause I work on fixed-scope productized sprints, we can isolate just the single highest-impact workflow (e.g., automated intake or calendar sync) to keep upfront investment low and demonstrate measurable ROI within 10 days.\n\nHappy to share a trimmed-down scope if that would be helpful?\n\nBest,\nZia`,
        nextStepRecommendation: 'Send trimmed 1-page proposal with a single deliverable.',
      };

    case 'timing':
      return {
        subject: 'Re: Timing / checking back later',
        body: `Hi [Name],\n\nUnderstood — timing is everything when managing active operations.\n\nI will pause our outreach and touch base in [e.g. 60–90 days] when bandwidth opens up. If anything shifts sooner, my email is always open.\n\nBest of luck with your current milestones!\n\nBest,\nZia`,
        nextStepRecommendation: 'Move lead to Nurture stage with a 60-day calendar reminder.',
      };

    case 'have_vendor':
      return {
        subject: 'Re: Collaboration & white-label capacity',
        body: `Hi [Name],\n\nGreat to hear you already have technical talent in place.\n\nRather than replacing existing providers, I frequently serve as specialized overflow capacity for complex LLM integrations, RAG architecture, or rapid sprints that in-house teams don’t have immediate bandwidth to tackle.\n\nI’d be glad to remain on your radar as a technical resource whenever surplus demand arises.\n\nBest regards,\nZia`,
        nextStepRecommendation: 'Tag as potential White-Label Agency / Tech Partner.',
      };

    case 'send_info':
      return {
        subject: 'Re: Technical summary and overview',
        body: `Hi [Name],\n\nHappy to share. Here is a brief 1-page architecture brief outlining how we typically approach this:\n\n- Scope: Turnkey implementation in 10-14 days\n- Stack: Python, TypeScript, modern API integrations\n- Deliverables: Fully tested, deployed, and documented\n\nWould you prefer a 2-minute Loom walkthrough or a concise PDF summary?\n\nBest,\nZia`,
        nextStepRecommendation: 'Attach verified productized offer PDF.',
      };

    case 'not_interested':
    default:
      return {
        subject: 'Re: Opt-out confirmed',
        body: `Hi [Name],\n\nThank you for letting me know. I have removed your details from all future communications. Wishing you continued success!\n\nBest,\nZia`,
        nextStepRecommendation: 'Trigger immediate suppression across email and all platforms.',
      };
  }
}
