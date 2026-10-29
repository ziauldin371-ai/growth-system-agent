import { ILLMProvider, GenerateOutreachContext } from '../types';
import { AIOutreachOutput, AIOutreachOutputSchema } from '@/lib/validation/schemas';

export class MockLLMProvider implements ILLMProvider {
  public readonly id = 'mock';
  public readonly name = 'Deterministic Grounded Mock Engine';

  public isConfigured(): boolean {
    return true; // Always available for offline dev, CI, and test execution
  }

  public async generateOutreachDraft(context: GenerateOutreachContext): Promise<AIOutreachOutput> {
    const { business, evidence = [], websiteCheck, contact, strategy, senderProfile } = context;

    const contactName = contact?.firstName || (contact?.fullName ? contact.fullName.split(' ')[0] : 'there');
    const companyName = business.name;
    const verifiedEvidence = evidence.filter(e => e.isFactual);

    const observations = verifiedEvidence.slice(0, 3).map(ev => ({
      fact: ev.summary,
      source: ev.sourceName,
      isVerified: ev.isFactual,
    }));

    if (observations.length === 0) {
      observations.push({
        fact: `Commercial business entity registered in ${business.city || business.country}.`,
        source: business.sourceProvider || 'Commercial Directory',
        isVerified: true,
      });
    }

    const warnings: string[] = [];
    if (!contact?.email) {
      warnings.push('No direct contact email available. Requires manual contact enrichment before sending.');
    }
    if (evidence.length === 0) {
      warnings.push('Sparse evidence profile. Review public activity manually prior to outreach.');
    }

    let subjectLines: [string, string, string];
    let selectedSubject: string;
    let researchSummary: string;
    let rationale: string;
    let valueProposition: string;
    let serviceOffer: string;
    let callToAction: string;
    let emailBody: string;

    if (strategy === 'web_development') {
      const webStatus = websiteCheck?.status || 'apparently_absent';
      const webStatusDesc = webStatus === 'social_only' 
        ? 'operating solely through social media' 
        : (webStatus === 'parked' ? 'hosting a placeholder registrar page' : 'lacking an active web domain');

      subjectLines = [
        `Digital booking & web presence for ${companyName}`,
        `Web infrastructure for ${companyName}`,
        `Capturing search inquiries for ${companyName}`,
      ];
      selectedSubject = subjectLines[0];

      researchSummary = `Verified active commercial operations for ${companyName} (${business.industry || 'Local Services'}), currently ${webStatusDesc}. Customer demand is evident through public activity, but inquiries are constrained by the absence of an automated direct web channel.`;
      
      rationale = `As a Full-Stack Developer specializing in high-performance web systems and automated booking workflows, I build custom digital platforms that convert local search volume directly into scheduled appointments and confirmed revenue.`;

      valueProposition = `A lightweight, high-converting web platform with automated scheduling and local SEO infrastructure to capture high-intent commercial inquiries without ongoing agency overhead.`;

      serviceOffer = `Turnkey custom web development: responsive design, automated booking integration, local search optimization, and zero monthly platform lock-in.`;

      callToAction = `Would you be open to a 10-minute introductory conversation next Tuesday to see how this would look for ${companyName}?`;

      emailBody = `Hi ${contactName},

I noticed ${companyName} has been consistently active across ${business.city || 'your area'}, yet your business appears to be ${webStatusDesc}.

When prospective clients look up ${business.industry || 'your services'} directly, having a verified, mobile-first website with instant online scheduling typically increases direct commercial inquiries by 25–40%.

As a Full-Stack AI & Web Engineer, I engineer tailored, fast-loading digital web platforms equipped with direct booking and automated customer intake—without bloated agency retainers.

${callToAction}

Best regards,

${senderProfile.name}
${senderProfile.title}
${senderProfile.specialization}`;

    } else if (strategy === 'rag_systems' || strategy === 'ai_automation') {
      subjectLines = [
        `Automating document workflows for ${companyName}`,
        `AI automation & RAG architecture for ${companyName}`,
        `Engineering support on LLM / Python workflows for ${companyName}`,
      ];
      selectedSubject = subjectLines[0];

      researchSummary = `Observed technical development signals at ${companyName}, including documented demand for AI pipelines, LLM knowledge retrieval, and automated document processing to alleviate operational friction.`;

      rationale = `As a Senior AI Engineer specializing in production LLM integrations, RAG architectures, and Python data pipelines, I help engineering teams implement production-grade document intelligence with deterministic evaluations and sub-second latency.`;

      valueProposition = `Production-ready RAG architectures and automated AI agents that ingest complex documents, enforce strict schema validation, and eliminate manual intake bottlenecks.`;

      serviceOffer = `End-to-end RAG and LLM agent architecture: vector search, hybrid retrieval, guardrails against hallucinations, and scalable FastAPI/Python microservices.`;

      callToAction = `Would you be open to a brief 15-minute technical exchange this week to review your current LLM pipeline requirements?`;

      emailBody = `Hi ${contactName},

I noted ${companyName}'s work in ${business.industry || 'the tech sector'} and your recent technical expansion around automated processing.

Deploying production LLM and RAG pipelines often introduces hurdles around retrieval latency, chunking accuracy, and strict output validation. As an AI Automation Architect and Python Developer, I build secure, high-throughput RAG systems and LLM integrations that plug cleanly into your existing architecture.

${callToAction}

Best regards,

${senderProfile.name}
${senderProfile.title}
${senderProfile.specialization}`;

    } else if (strategy === 'agency_partner') {
      subjectLines = [
        `White-label AI & full-stack development capacity for ${companyName}`,
        `Technical implementation partner for ${companyName}`,
        `Senior AI & Python engineering for client deliverables`,
      ];
      selectedSubject = subjectLines[0];

      researchSummary = `Identified ${companyName} as a reputable agency delivering digital and strategy solutions. As client demand for AI and custom software rises, having on-demand senior technical capacity accelerates pipeline fulfillment.`;

      rationale = `I serve as an elite, white-label technical partner for agencies, delivering full-stack Next.js applications, Python automation, and custom LLM solutions under your agency's banner.`;

      valueProposition = `On-demand senior engineering capacity that delivers client software, custom APIs, and AI integrations on schedule without adding fixed full-time headcount.`;

      serviceOffer = `White-label AI and full-stack software development: scoping, architecture, implementation, and code handover directly under your agency brand.`;

      callToAction = `Are you open to a quick introductory call to discuss whether an engineering partner fits your upcoming project pipeline?`;

      emailBody = `Hi ${contactName},

I came across ${companyName}'s client work in ${business.industry || 'digital marketing and strategy'}.

As clients increasingly request bespoke AI features, workflow automation, and custom full-stack web applications, scoping and staffing these projects in-house can strain core delivery teams.

I partner with select agencies as a white-label Full-Stack AI Developer & Automation Architect, building production-ready LLM agents, Next.js web applications, and Python data workflows behind your agency brand.

${callToAction}

Best regards,

${senderProfile.name}
${senderProfile.title}
${senderProfile.specialization}`;

    } else {
      // Default: Python Engineering / Full-Stack SaaS
      subjectLines = [
        `Senior engineering & Python capacity for ${companyName}`,
        `Full-stack software development support for ${companyName}`,
        `Accelerating roadmap delivery at ${companyName}`,
      ];
      selectedSubject = subjectLines[0];

      researchSummary = `Documented engineering signals indicating active product expansion and technical roadmap requirements at ${companyName}.`;

      rationale = `As a Full-Stack Developer & Python Engineer, I step in to build high-reliability APIs, data pipelines, and responsive SaaS frontends with zero onboarding friction.`;

      valueProposition = `Immediate technical execution velocity for SaaS MVPs, automated backend workflows, and scalable database architectures.`;

      serviceOffer = `Full-stack TypeScript/Next.js and Python development, REST/GraphQL API design, database migrations, and cloud deployment.`;

      callToAction = `Would you have 10 minutes next week for a brief engineering chat on your current sprint priorities?`;

      emailBody = `Hi ${contactName},

I have been following ${companyName}'s trajectory in ${business.industry || 'software'} and noted your team's current development focus.

When scaling technical features, having access to an experienced full-stack engineer who works across TypeScript, Python, and data systems allows you to ship critical milestones without protracted hiring cycles.

${callToAction}

Best regards,

${senderProfile.name}
${senderProfile.title}
${senderProfile.specialization}`;
    }

    const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; font-size: 15px;">
  ${emailBody.split('\n\n').map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
</div>
`.trim();

    const output: AIOutreachOutput = {
      researchSummary,
      observations,
      rationale,
      valueProposition,
      subjectLines,
      selectedSubject,
      emailBody,
      htmlBody,
      callToAction,
      serviceOffer,
      confidenceRating: 0.90,
      warnings,
    };

    return AIOutreachOutputSchema.parse(output);
  }
}
