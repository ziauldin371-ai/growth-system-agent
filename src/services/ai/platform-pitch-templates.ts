import { PlatformItem } from '@/data/platforms-registry';

export interface OperatorProfile {
  id?: string;
  name: string;
  headline: string;
  services: string;
  portfolioLinks: string[];
  bio: string;
  yearsOfExperience?: string;
  rateRange: string;
  availability: string;
  languages: string;
  timezone: string;
  demoModeEnabled?: boolean;
}

export const DEFAULT_OPERATOR_PROFILE: OperatorProfile = {
  id: 'default',
  name: 'Zia Ul Din',
  headline: 'Solo AI, Automation & Web Developer',
  services: 'AI automation (n8n, Make, Zapier workflows), LLM / RAG / chatbot integrations, ML / data projects, websites and web apps for small businesses',
  portfolioLinks: [
    'https://github.com/ziauldin371-ai',
    '',
    ''
  ],
  bio: 'Solo developer building end-to-end workflow automations, retrieval-augmented generation (RAG) AI systems, and responsive web applications for growing businesses.',
  yearsOfExperience: '4+ years',
  rateRange: '$35 - $65 / hr',
  availability: '20-30 hrs/week',
  languages: 'English, Urdu',
  timezone: 'PKT (UTC+5)',
  demoModeEnabled: false,
};

export interface PitchResult {
  text: string;
  subject?: string;
  pitchType: string;
  wordCount: number;
  characterCount: number;
  missingFields: string[];
  platformRules: string;
  variants?: Array<{ label: string; text: string }>;
}

export const FORBIDDEN_WORDS = [
  'primary inbox',
  'spam safe',
  'no spam flag',
  'proven',
  'guarantee',
  'guaranteed',
  'bypass',
  '100%',
  'act now',
  'limited time'
];

export function getPlatformRules(pitchType: string): string {
  switch (pitchType) {
    case 'marketplace proposal':
      return 'Platform Rules: Submit proposals yourself. Never use automated bidding bots or mass copy-paste templates. Keep all client discussions and initial contracts strictly on-platform to comply with Terms of Service.';
    case 'network application':
      return 'Platform Rules: Direct screening with staff recruiters. Submit only real, verified production links. Do not fabricate certificates or project outcomes.';
    case 'directory profile + reply template':
      return 'Platform Rules: Complete all verified certification prerequisites on official partner portals before claiming accredited partner badges. Respond to client inquiries within 24 hours.';
    case 'cold email / LinkedIn note':
      return 'Platform Rules: Strictly manual connection requests (<= 300 characters). Never use browser extension scrapers or unapproved bot extensions. Respect LinkedIn weekly invite limits.';
    case 'cold email / contact form message':
      return 'Platform Rules: Send only through your own verified email pipeline with physical address and clear opt-out mechanics. Ground every message in observable technical facts.';
    case 'community reply':
      return 'Platform Rules: Help first, never spam. Read the community’s self-promotion and frequency rules. Never pitch unless the original post explicitly requests contractor services or community rules allow it.';
    default:
      return 'Platform Rules: Review official platform terms before connecting.';
  }
}

export function generatePlatformPitch(
  platform: PlatformItem,
  profile: OperatorProfile = DEFAULT_OPERATOR_PROFILE,
  context?: {
    jobDescription?: string;
    targetCompany?: string;
    workflowSignal?: string;
  }
): PitchResult {
  const missingFields: string[] = [];
  const validPortfolios = (profile.portfolioLinks || []).filter((l) => l && l.trim().length > 0);

  if (validPortfolios.length === 0) {
    missingFields.push('portfolio_links');
  }
  if (!profile.headline || profile.headline.trim().length === 0) {
    missingFields.push('headline');
  }
  if (!profile.services || profile.services.trim().length === 0) {
    missingFields.push('services');
  }

  const portfolioProof =
    validPortfolios.length > 0
      ? `You can review my code and projects here: ${validPortfolios[0]}`
      : `[Add your portfolio link in My Profile to display your proof link here]`;

  let text = '';
  let subject: string | undefined;
  const platformRules = getPlatformRules(platform.pitchType);

  switch (platform.pitchType) {
    case 'marketplace proposal': {
      // 120-200 words, no copy-paste feel, includes one smart question, 4-part structure
      const primaryService = profile.services ? profile.services.split(',')[0].trim() : 'AI automation and web development';
      text = `Hi,

I reviewed your project requirements regarding ${primaryService}.

My approach:
1. Map your existing data and trigger sources (APIs, webhooks, or database tables).
2. Build and test the automation workflows in clean, modular steps with robust error handling.
3. Provide complete documentation and handoff so your team can maintain it smoothly.

${portfolioProof}

One quick question to make sure we are aligned on scope: What system or database will serve as your primary source of truth for this workflow?

I am available ${profile.availability || '20-30 hrs/week'} (timezone: ${profile.timezone || 'PKT (UTC+5)'}) and can begin with an initial milestone review.

Best regards,
${profile.name}`;
      break;
    }

    case 'network application': {
      // Short summary, strongest projects, availability
      const projectsSnippet =
        validPortfolios.length > 0
          ? `Selected production work and repositories:\n${validPortfolios.map((p, idx) => `• Project ${idx + 1}: ${p}`).join('\n')}`
          : `• Portfolio: [Add your portfolio link in My Profile to display your verified work]`;

      text = `Candidate Summary: ${profile.name} — ${profile.headline}

Core Capabilities:
${profile.services}

Experience & Focus:
${profile.bio || 'Solo engineer delivering production workflow automations, API integrations, and modern web applications.'}

${projectsSnippet}

Availability: ${profile.availability || '20-30 hrs/week'}
Rate Range: ${profile.rateRange || '$35 - $65 / hr'}
Timezone: ${profile.timezone || 'PKT (UTC+5)'} (flexible overlap available)
Languages: ${profile.languages || 'English, Urdu'}`;
      break;
    }

    case 'directory profile + reply template': {
      // Headline + 3-line bio + services list + reply template for inbound messages
      text = `[DIRECTORY PROFILE]
Headline: ${profile.headline}
Services: ${profile.services}
Summary:
${profile.bio || 'Building reliable business automation workflows, conversational AI interfaces, and fast small business websites.'}
Availability: ${profile.availability || 'Open for select client contracts'}
Portfolio: ${validPortfolios[0] || '[Add your portfolio link in My Profile]'}

---

[INBOUND CLIENT REPLY TEMPLATE]
Hi [Client Name],

Thank you for reaching out via ${platform.name}.

I would be happy to review your workflow and technical requirements. To give you an accurate scope and milestone plan:
1. What tools or APIs are currently involved?
2. What is your preferred timeline for the first working version?

${portfolioProof}

Looking forward to hearing from you.

Best regards,
${profile.name}`;
      break;
    }

    case 'cold email / LinkedIn note': {
      // LinkedIn connection note <= 300 chars, follow-up <= 600 chars
      const company = context?.targetCompany || '[Company]';
      const shortNote = `Hi [Name], I noticed ${company}'s work and wanted to connect. I help teams streamline operations using ${profile.services.split(',')[0].trim()}. Would value staying connected.`;
      const truncatedNote = shortNote.length > 300 ? shortNote.slice(0, 297) + '...' : shortNote;

      text = `[LINKEDIN CONNECTION NOTE (<= 300 chars)]
${truncatedNote}

---

[FOLLOW-UP MESSAGE (<= 600 chars)]
Hi [Name], thanks for connecting!

I work with growing businesses to eliminate manual operations using custom integrations and automation pipelines. If you have any recurring bottlenecks or are considering an AI/automation integration at ${company}, I would be glad to share an architecture outline.

${portfolioProof}

Best,
${profile.name}`;
      break;
    }

    case 'cold email / contact form message': {
      // 80-120 words, physical address, opt-out line
      const company = context?.targetCompany || '[Company]';
      const workflow = context?.workflowSignal || 'operational workflows and customer web capture';
      subject = `Idea for ${workflow} at ${company}`;

      text = `Hi [Name],

I was reviewing ${company}'s online presence and noticed an opportunity to optimize your ${workflow}.

I build custom automations and modern web platforms that connect inquiry forms directly to CRM and notification backends, reducing response delays for customers.

${portfolioProof}

Would you be open to a 5-minute conversation or a brief email outline of how this could work for ${company}?

Best regards,
${profile.name}
${profile.headline}

---
To opt out of future emails, reply with "unsubscribe" or click the opt-out link.
Physical address: ${process.env.PHYSICAL_MAILING_ADDRESS || 'Islamabad, Pakistan'}`;
      break;
    }

    case 'community reply': {
      // Helpful first, no pitch unless requested
      text = `Hi! Regarding your question about workflow automation and API integrations:

A clean way to solve this is:
1. Decouple your webhook trigger from processing so rate limits don't drop payloads.
2. Use an orchestration tool like n8n or Make to route events into your database.
3. Implement automated retries with exponential backoff on third-party API calls.

If you are using self-hosted nodes or custom Python scripts, feel free to ask follow-up questions here and I'm happy to help troubleshoot.

(If you ever need hands-on implementation help, I work as a solo automation developer: ${validPortfolios[0] || 'profile available on request'}).`;
      break;
    }

    case 'not needed':
    default: {
      text = `${platform.name} is a reference sending tool. It is not needed because this application sends outreach directly and safely through your own authenticated Gmail API pipeline.`;
      break;
    }
  }

  // Word count and character count calculation
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const characterCount = text.length;

  return {
    text,
    subject,
    pitchType: platform.pitchType,
    wordCount,
    characterCount,
    missingFields,
    platformRules,
  };
}
