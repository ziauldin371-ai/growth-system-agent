import { z } from 'zod';
import { IntentType, ReplyRoute, IntentOpportunityEntity, IntentPlatform } from '@/types';
import { sanitizeUntrustedText } from '../ai/prompt-defense';

export const IntentClassificationSchema = z.object({
  intentType: z.enum([
    'explicit_hire_request',
    'job_posting',
    'recommendation_request',
    'tender',
    'pain_point_complaint',
    'partnership_request',
    'not_relevant',
  ]),
  neededSkills: z.array(z.string()),
  statedBudget: z.string().nullable().optional(),
  urgency: z.enum(['immediate', 'high', 'moderate', 'low', 'unspecified']),
  locationOrTz: z.string().nullable().optional(),
  contractType: z.enum(['freelance_contract', 'full_time', 'part_time', 'project_based', 'unspecified']),
  posterIdentity: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactHandle: z.string().nullable().optional(),
  applyUrl: z.string().url().nullable().optional(),
  fitScore: z.number().min(0).max(100),
  fitReasoning: z.string(),
  legitimacyScore: z.number().min(0).max(100),
  isLegitimate: z.boolean(),
  scamWarningFlags: z.array(z.string()),
  replyRoute: z.enum(['email', 'dm', 'public_comment', 'marketplace_proposal', 'apply_link', 'manual_reachout']),
});

export type ClassifiedIntent = z.infer<typeof IntentClassificationSchema>;

const CORE_SKILL_KEYWORDS: Record<string, string[]> = {
  ai_agents: ['ai agent', 'agentic', 'langchain', 'langgraph', 'crewai', 'autogen', 'autonomous agent'],
  llm_rag: ['llm', 'rag', 'vector database', 'retrieval augmented', 'pinecone', 'chroma', 'qdrant', 'embedding', 'openai', 'gemini', 'claude', 'chatbot'],
  python_automation: ['python', 'fastapi', 'flask', 'automation', 'scraping', 'etl', 'celery', 'selenium', 'playwright', 'workflow'],
  data_science: ['data science', 'machine learning', 'analytics', 'dashboard', 'pandas', 'pytorch', 'sklearn', 'sql', 'bi'],
  full_stack: ['full stack', 'next.js', 'react', 'typescript', 'node.js', 'saas', 'tailwind', 'api integration', 'supabase'],
  websites: ['website', 'web development', 'landing page', 'booking site', 'redesign web'],
  white_label: ['white label', 'agency partner', 'overflow developer', 'subcontractor', 'freelance developer'],
};

const SCAM_PATTERNS = [
  { trigger: /deposit (first|funds|fee)/i, flag: 'Requires upfront payment or fee to work (advance fee scam)' },
  { trigger: /wire money|western union|cashier check/i, flag: 'Asks to transfer funds or process checks' },
  { trigger: /crypto pump|token presale|meme coin promoter/i, flag: 'Suspicious crypto promotional scheme' },
  { trigger: /unpaid (trial|test) for (2|two|3|three) weeks/i, flag: 'Exploitative multi-week unpaid work request' },
  { trigger: /send passport|driver license scan|ssn|social security/i, flag: 'Asks for sensitive personal identity documents upfront' },
  { trigger: /telegram only @[a-z0-9_]+ for immediate payment/i, flag: 'Off-platform untraceable payment trap' },
];

/**
 * Classifies a raw public post or job listing against Zia Ul Din's skill offerings
 * with strict prompt injection defense and scam filtering.
 */
export function classifyRawIntentPost(raw: {
  platform: IntentPlatform;
  sourceUrl: string;
  sourceIdentifier?: string;
  title: string;
  rawText: string;
  postedAt: string;
  author?: string;
}): IntentOpportunityEntity {
  // 1. Sanitize text against prompt injection and delimiters
  const cleanTitle = sanitizeUntrustedText(raw.title);
  const cleanBody = sanitizeUntrustedText(raw.rawText);
  const combinedText = `${cleanTitle}\n${cleanBody}`.toLowerCase();

  // 2. Scam / Legitimacy Check
  const scamWarnings: string[] = [];
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.trigger.test(combinedText)) {
      scamWarnings.push(pattern.flag);
    }
  }

  let legitimacyScore = 100;
  if (scamWarnings.length > 0) {
    legitimacyScore = Math.max(10, 100 - (scamWarnings.length * 40));
  }
  const isLegitimate = legitimacyScore >= 60;

  // 3. Match Skills against Zia's Core Profile
  const matchedSkills: string[] = [];
  let skillFitPoints = 0;

  for (const [skillCat, keywords] of Object.entries(CORE_SKILL_KEYWORDS)) {
    for (const kw of keywords) {
      if (combinedText.includes(kw)) {
        matchedSkills.push(kw);
        skillFitPoints += 12;
        break;
      }
    }
  }

  // Cap base skill fit points at 70
  skillFitPoints = Math.min(70, skillFitPoints);

  // 4. Intent Type Classification
  let intentType: IntentType = 'not_relevant';
  let intentBonus = 0;

  if (/(looking for (a |an )?([a-z0-9_-]+ )*(developer|engineer|freelancer|expert|architect|specialist)|need(s)? (someone|an? )?([a-z0-9_-]+ )*(developer|engineer|architect|freelancer|expert|to build)|seeking (a |an )?([a-z0-9_-]+ )*(freelancer|contractor|developer|engineer))/i.test(combinedText)) {
    intentType = 'explicit_hire_request';
    intentBonus = 35;
  } else if (/\[hiring\]|we are hiring|job opening|freelance position|contract role/i.test(combinedText)) {
    intentType = 'job_posting';
    intentBonus = 25;
  } else if (/(can anyone recommend|who is the best person to build|looking for recommendations)/i.test(combinedText)) {
    intentType = 'recommendation_request';
    intentBonus = 25;
  } else if (/(request for proposal|tender|solicitation|rfp)/i.test(combinedText)) {
    intentType = 'tender';
    intentBonus = 20;
  } else if (/(agency overflow|white-label partner|need technical subcontractor)/i.test(combinedText)) {
    intentType = 'partnership_request';
    intentBonus = 28;
  } else if (matchedSkills.length > 0) {
    intentType = 'pain_point_complaint';
    intentBonus = 15;
  }

  // 5. Freshness Calculation (Hot window: 0-48h)
  const postTime = new Date(raw.postedAt).getTime();
  const hoursOld = Math.max(0, (Date.now() - postTime) / (1000 * 60 * 60));
  let freshnessMultiplier = 1.0;

  if (hoursOld <= 12) {
    freshnessMultiplier = 1.1; // Freshness boost for first 12 hours
  } else if (hoursOld <= 48) {
    freshnessMultiplier = 1.0;
  } else if (hoursOld <= 168) { // Up to 7 days
    freshnessMultiplier = 0.7;
  } else {
    freshnessMultiplier = 0.3; // Older than 7 days drops sharply
  }

  const rawFit = Math.round((skillFitPoints + intentBonus) * (isLegitimate ? 1.0 : 0.3));
  const fitScore = Math.min(100, Math.round(rawFit * freshnessMultiplier));

  // 6. Extract Contact Methods
  const emailMatch = combinedText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  const contactEmail = emailMatch ? emailMatch[1] : undefined;

  let replyRoute: ReplyRoute = 'manual_reachout';
  if (contactEmail) {
    replyRoute = 'email';
  } else if (raw.platform === 'upwork_manual' || raw.platform === 'remote_ok') {
    replyRoute = 'marketplace_proposal';
  } else if (raw.platform === 'reddit' || raw.platform === 'hacker_news') {
    replyRoute = 'public_comment';
  } else if (raw.platform === 'x_twitter' || raw.platform === 'linkedin_manual') {
    replyRoute = 'dm';
  }

  // 7. Extract Budget & Urgency Signals
  let budgetSignal: string | null = null;
  const budgetMatch = raw.rawText.match(/(\$[0-9,]+(\s*-\s*\$[0-9,]+)?|\£[0-9,]+(\s*-\s*\£[0-9,]+)?|([0-9]+k\s*-\s*[0-9]+k))/i);
  if (budgetMatch) {
    budgetSignal = budgetMatch[0];
  }

  let urgency: string = 'moderate';
  if (/urgent|asap|immediately|start today|this week/i.test(combinedText)) {
    urgency = 'immediate';
  }

  const id = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    sourcePlatform: raw.platform,
    sourceUrl: raw.sourceUrl,
    sourceIdentifier: raw.sourceIdentifier || null,
    title: raw.title,
    rawContent: raw.rawText,
    sanitizedSummary: cleanBody.slice(0, 300) + (cleanBody.length > 300 ? '...' : ''),
    posterIdentity: raw.author || 'Anonymous Poster',
    posterContactInfo: {
      email: contactEmail,
      applyUrl: raw.sourceUrl,
    },
    intentType,
    neededSkills: matchedSkills,
    statedBudget: budgetSignal,
    urgency,
    locationOrTz: 'Remote / Unspecified',
    contractType: /full[- ]time/i.test(combinedText) ? 'full_time' : 'freelance_contract',
    fitScore,
    fitReasoning: `Matched ${matchedSkills.length} core specialization skills (${matchedSkills.slice(0, 3).join(', ')}) with ${intentType.replace(/_/g, ' ')} intent.`,
    legitimacyScore,
    isLegitimate,
    scamWarningFlags: scamWarnings,
    replyRoute,
    status: 'new',
    postedAt: new Date(raw.postedAt).toISOString(),
    fetchedAt: new Date().toISOString(),
    respondWithinHours: urgency === 'immediate' ? 4 : 12,
    isManualImport: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
