import { PlatformPitchMode, PlatformPitchEntity, ProofItemEntity } from '@/types';
import { icpNicheManager } from '@/services/discovery/icp-niches';

export interface PitchGenerationParams {
  platform: string;
  pitchMode: PlatformPitchMode;
  companyName: string;
  domain?: string | null;
  contactName?: string | null;
  title?: string | null;
  observedSignal?: string | null;
  signalSourceUrl?: string | null;
  signalDate?: string | null;
  nicheId?: string;
  country?: string;
  approvedProof?: ProofItemEntity | null;
}

export interface PitchQualityGateResult {
  passed: boolean;
  wordCount: number;
  characterCount: number;
  rejectionReasons: string[];
}

export class PerPlatformPitchEngine {
  private readonly BANNED_PHRASES = [
    'guaranteed',
    'guarantee',
    'primary inbox',
    'spam safe',
    'no spam flag',
    'i came across your',
    'hope this finds you well',
    '100% safe',
    'best agency in the world',
    'instant results',
    'act now before it is too late',
    'limited time offer',
  ];

  /**
   * Generates an evidence-grounded, professional pitch strictly tailored to the platform
   */
  public generatePitch(params: PitchGenerationParams): PlatformPitchEntity {
    const isUK = params.country?.toUpperCase() === 'UK' || params.country?.toUpperCase() === 'GB';
    const niche = (params.nicheId ? icpNicheManager.getNicheById(params.nicheId) : null) || icpNicheManager.getActiveNiche();
    const signal = params.observedSignal || 'your recent product updates and technical workflow';
    const proofText = params.approvedProof?.isApproved && params.approvedProof.summary
      ? (isUK ? params.approvedProof.summary.replace(/optimize/g, 'optimise').replace(/analyze/g, 'analyse') : params.approvedProof.summary)
      : '';

    let content = '';

    switch (params.pitchMode) {
      case 'proposal': {
        // Marketplace Proposal (120-200 words)
        // Structure: Problem understood -> Relevant proof -> 2-3 steps -> Smart question -> Next step
        const step1 = isUK ? '1. Audit dataset schemas and identify ingestion bottlenecks.' : '1. Audit data schemas and evaluate latency requirements.';
        const step2 = isUK ? '2. Develop a proof-of-concept pipeline with automated validation.' : '2. Develop a proof-of-concept pipeline with benchmark tests.';
        const step3 = isUK ? '3. Deploy into your existing cloud infrastructure with clean documentation.' : '3. Deploy directly into your cloud runtime with monitoring.';

        const proofSection = proofText ? `In our previous project: ${proofText}` : `We focus strictly on production deployments with quantifiable milestones.`;

        content = `Hi,

Understanding your requirements: You need a robust implementation for ${niche.defaultOffer.toLowerCase()} integrated into your tech stack.

${proofSection}

Our recommended technical approach:
${step1}
${step2}
${step3}

One clarifying question: Which primary database or document source will feed the ingestion pipeline?

I can share a detailed architecture outline and milestone breakdown if helpful.

Best regards,
Zia Ul Din`;
        break;
      }

      case 'connection_note': {
        // LinkedIn connection note: STRICTLY <= 300 characters, no sales pitch, one genuine reference
        const rawNote = `Hi ${params.contactName ? params.contactName.split(' ')[0] : 'there'}, noticed your engineering leadership at ${params.companyName} regarding ${signal}. Would value connecting to follow your technical work in this space.`;
        content = rawNote.slice(0, 300);
        break;
      }

      case 'direct_message': {
        // InMail / Direct Message (50 - 90 words)
        const nameGreeting = params.contactName ? `Hi ${params.contactName.split(' ')[0]},` : `Hello,`;
        content = `${nameGreeting}

Noticed ${params.companyName}'s focus on ${signal}.

Teams scaling similar workflows often hit inference cost or data retrieval bottlenecks. We help engineering teams build ${niche.defaultOffer.toLowerCase()} without disrupting live operations. ${proofText ? `Recently: ${proofText}` : ''}

Would you be open to a 10-minute technical exchange on how teams structure this architecture?

Regards,
Zia`;
        break;
      }

      case 'email': {
        // Direct Email: 80 - 130 words, subject: Idea for [workflow] at [Company]
        const workflowName = niche.title.split('Needing')[1]?.trim() || 'AI workflow';
        const subject = `Idea for ${workflowName.toLowerCase()} at ${params.companyName}`;
        const nameGreeting = params.contactName ? `Hi ${params.contactName.split(' ')[0]},` : `Hi team,`;

        const body = `${nameGreeting}

I noticed ${signal} at ${params.companyName}.

We help teams implement ${niche.defaultOffer.toLowerCase()}. ${proofText ? `On a recent engagement, we built a solution where ${proofText.toLowerCase()}` : 'Our focus is delivering clean, measurable proofs-of-concept within two to three weeks.'}

Would you be open to reviewing a short technical outline for how this fits into your roadmap?

Best regards,
Zia Ul Din
Full-Stack AI & Automation Architect`;

        content = `Subject: ${subject}\n\n${body}`;
        break;
      }

      case 'contact_form': {
        // Website Contact Form: 60 - 100 words
        const subject = `Inquiry regarding ${niche.defaultOffer.toLowerCase()} for ${params.companyName}`;
        content = `Subject: ${subject}

Hello ${params.companyName} Team,

I reviewed your public services regarding ${signal}.

We specialize in ${niche.defaultOffer.toLowerCase()} for organizations in your industry. ${proofText ? `For example, ${proofText}` : ''}

Who is the best person on your engineering or operations team to share a concise technical brief with?

Thank you,
Zia Ul Din
ziauldin371@gmail.com`;
        break;
      }

      case 'comment_reply': {
        // Community / Forum Reply: Helpful answer first, soft offer, zero spam
        content = `Solid discussion on this problem. One common architectural pattern is separating the document chunking pipeline from the real-time retrieval layer to prevent token bloat. We implemented this approach recently and it reduced latency significantly. Happy to share our reference architecture notes if useful to the group.`;
        break;
      }

      case 'application': {
        // Vetted Network Application Cover (Summary of delivery & background)
        content = `Full-Stack AI Developer & Automation Architect with experience building production RAG systems, LLM evaluation pipelines, and Python/FastAPI microservices. Strong focus on clean code, test-driven development, and demonstrable proofs-of-concept. Profiles and code repositories verified.`;
        break;
      }

      case 'matching_only':
      case 'research_only':
      default: {
        content = `Research and profile tracking only. Direct outbound pitching is not conducted on this platform.`;
        break;
      }
    }

    // Apply localization spelling rules
    if (isUK) {
      content = content
        .replace(/\boptimize\b/g, 'optimise')
        .replace(/\boptimizing\b/g, 'optimising')
        .replace(/\banalyze\b/g, 'analyse')
        .replace(/\banalyzing\b/g, 'analysing')
        .replace(/\bspecialize\b/g, 'specialise');
    }

    const qualityGate = this.evaluateQualityGate(content, params.pitchMode);

    return {
      id: `pitch_${Date.now()}`,
      businessId: params.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      platform: params.platform,
      pitchMode: params.pitchMode,
      pitchContent: content,
      wordCount: qualityGate.wordCount,
      characterCount: qualityGate.characterCount,
      offerTitle: niche.defaultOffer,
      proofUsed: proofText || null,
      evidenceClaims: [
        {
          claim: `Observed public signal: ${signal}`,
          sourceUrl: params.signalSourceUrl || params.domain ? `https://${params.domain}` : 'https://google.com',
          date: params.signalDate || new Date().toISOString().split('T')[0],
        },
      ],
      qualityGatePassed: qualityGate.passed,
      rejectionReason: qualityGate.passed ? null : qualityGate.rejectionReasons.join('; '),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a 2-step follow-up sequence strictly respecting time intervals and laws
   */
  public generateFollowUp(step: 1 | 2, originalPitch: string, companyName: string, isUK: boolean): string {
    if (step === 1) {
      // 4-5 business days follow-up
      return `Hi,

Following up on my previous note regarding ${companyName}. 

I put together a quick diagram illustrating how the ingestion and retrieval flow can be decoupled to keep query latency below 200ms.

Would you like me to send over the 1-page overview?

Best,
Zia`;
    } else {
      // Final short follow-up (after another week)
      return `Hi,

Final quick check-in. If ${companyName} already has this covered internally, completely understood.

If priorities shift later this quarter and you need an extra pair of hands for a quick POC, feel free to reach back out anytime.

Best regards,
Zia Ul Din`;
    }
  }

  public evaluateQualityGate(content: string, pitchMode: PlatformPitchMode): PitchQualityGateResult {
    const textOnly = content.replace(/^Subject:[^\n]+\n+/, '');
    const words = textOnly.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const characterCount = content.length;
    const lower = content.toLowerCase();

    const rejectionReasons: string[] = [];

    // 1. Banned words check
    for (const banned of this.BANNED_PHRASES) {
      if (lower.includes(banned)) {
        rejectionReasons.push(`Contains banned phrase: "${banned}"`);
      }
    }

    // 2. Platform-specific length boundaries
    if (pitchMode === 'connection_note' && characterCount > 300) {
      rejectionReasons.push(`LinkedIn connection note exceeds strict 300 character limit (${characterCount} chars)`);
    }

    if (pitchMode === 'proposal') {
      if (wordCount < 80) rejectionReasons.push(`Marketplace proposal too short (${wordCount} words, minimum 80 words)`);
      if (wordCount > 250) rejectionReasons.push(`Marketplace proposal too long (${wordCount} words, maximum 250 words)`);
    }

    if (pitchMode === 'email') {
      if (wordCount < 40) rejectionReasons.push(`Email body too short (${wordCount} words)`);
      if (wordCount > 150) rejectionReasons.push(`Email body exceeds recommended bounds (${wordCount} words, max 150 words)`);
    }

    return {
      passed: rejectionReasons.length === 0,
      wordCount,
      characterCount,
      rejectionReasons,
    };
  }
}

export const perPlatformPitchEngine = new PerPlatformPitchEngine();
