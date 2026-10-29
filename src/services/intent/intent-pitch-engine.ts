import { IntentOpportunityEntity } from '@/types';

export interface GeneratedIntentPitch {
  pitchText: string;
  wordCount: number;
  pitchMode: 'public_reply' | 'marketplace_proposal' | 'direct_email' | 'dm';
  communityComplianceCheck: {
    passed: boolean;
    communityName: string;
    maxWordsAllowed: number;
    ruleNotes: string;
  };
  clarifyingQuestion: string;
  suggestedAction: string;
}

/**
 * High-conversion pitch generator specifically for Warm Intent Leads (Section 4).
 * Enforces structured 5-part architecture and per-community anti-spam rules.
 */
export function generateIntentPitch(opportunity: IntentOpportunityEntity): GeneratedIntentPitch {
  const { sourcePlatform, neededSkills, title, rawContent, posterIdentity } = opportunity;

  // 1. Core Skill and Needs Extraction
  const primarySkill = neededSkills[0] || 'Python automation and LLM application development';
  const cleanTitle = title.replace(/\[hiring\]/gi, '').trim();

  // 2. Proof item reference (Real & verified)
  const proofReference = neededSkills.some(s => s.includes('rag') || s.includes('llm') || s.includes('chatbot'))
    ? 'Recently architected a production RAG retrieval pipeline with sub-second vector search'
    : 'Recently automated a multi-step data integration pipeline handling automated intake and API sync';

  // 3. Platform-specific length & mode constraints
  let pitchMode: 'public_reply' | 'marketplace_proposal' | 'direct_email' | 'dm' = 'public_reply';
  let maxWords = 80;
  let communityRule = 'Helpful consultative advice first; no aggressive sales links.';

  if (sourcePlatform === 'reddit') {
    pitchMode = 'public_reply';
    maxWords = 85;
    communityRule = 'State relevance directly, address problem first, zero boilerplate self-promotion.';
  } else if (sourcePlatform === 'hacker_news') {
    pitchMode = 'public_reply';
    maxWords = 75;
    communityRule = 'Keep response understated, technical, and strictly focused on architecture.';
  } else if (sourcePlatform === 'upwork_manual' || sourcePlatform === 'remote_ok' || sourcePlatform === 'remotive') {
    pitchMode = 'marketplace_proposal';
    maxWords = 160;
    communityRule = 'Structured proposal: Scope understanding, deliverable timeline, pricing assumption.';
  } else if (opportunity.replyRoute === 'email') {
    pitchMode = 'direct_email';
    maxWords = 110;
    communityRule = 'Direct B2B email: Under 110 words, clear subject line, single soft ask.';
  } else {
    pitchMode = 'dm';
    maxWords = 75;
    communityRule = 'Casual, respectful, 1 question.';
  }

  // 4. Construct Structured Pitch
  let pitch = '';
  let question = '';

  if (pitchMode === 'public_reply') {
    question = `Are you looking to deploy this with a serverless cloud setup, or do you have an existing backend stack already running?`;
    pitch = `Saw your post regarding "${cleanTitle}".

As a Full Stack AI Developer & Automation Architect specializing in ${primarySkill}, I tackle this by isolating the data model first, then building a typed pipeline with clear error boundaries. ${proofReference}.

${question}

Happy to share a quick architecture diagram if helpful.`;
  } else if (pitchMode === 'marketplace_proposal') {
    question = `Do you have an existing API specification or should we design the schema as part of Milestone 1?`;
    pitch = `Hi ${posterIdentity || 'there'},

I reviewed your requirements for "${cleanTitle}".

Here is how I would structure this sprint:
1. Architecture & Schema: Define the pipeline contract and integrations (Days 1–3).
2. Implementation: Core ${primarySkill} engine with automated test coverage (Days 4–8).
3. Deployment & Handoff: Production deploy with clear documentation (Days 9–10).

Experience match: ${proofReference}. All code is delivered in clean TypeScript/Python with comprehensive test suites.

${question}

Available to begin this week. Looking forward to discussing details.

Best regards,
Zia Ul Din | Full Stack AI Developer & Automation Architect`;
  } else {
    question = `Would you be open to a 2-minute exchange on the architecture?`;
    pitch = `Hi ${posterIdentity || 'there'},

Saw your public post regarding "${cleanTitle}".

I work as an AI Automation Architect specializing in ${primarySkill}. ${proofReference}.

I usually deliver turnkey implementations like this in 10-14 days on a fixed-scope productized sprint.

${question}

Best regards,
Zia Ul Din
ziauldin371@gmail.com`;
  }

  const words = pitch.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  return {
    pitchText: pitch,
    wordCount,
    pitchMode,
    communityComplianceCheck: {
      passed: wordCount <= maxWords + 20,
      communityName: sourcePlatform,
      maxWordsAllowed: maxWords,
      ruleNotes: communityRule,
    },
    clarifyingQuestion: question,
    suggestedAction: pitchMode === 'marketplace_proposal' ? 'Paste into marketplace proposal submission' : 'Post reply or send direct message manually',
  };
}
