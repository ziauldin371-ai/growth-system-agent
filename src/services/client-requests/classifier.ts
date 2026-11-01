/**
 * Client Request Classifier & Information Extractor
 * Filters raw posts against target services and extracts structured need & contact info.
 */

export const TARGET_SERVICE_KEYWORDS = [
  'ai automation',
  'automation',
  'n8n',
  'make.com',
  'integromat',
  'zapier',
  'workflow',
  'chatbot',
  'llm',
  'rag',
  'openai',
  'python',
  'machine learning',
  'data pipeline',
  'web scraping',
  'scraper',
  'api integration',
  'api',
  'website',
  'web app',
  'next.js',
  'react',
  'no-code',
  'nocode',
  'developer',
  'engineer',
  'freelancer',
  'contractor',
];

export interface ExtractedRequestData {
  isRelevant: boolean;
  matchScore: number;
  needSummary: string;
  exactQuote: string;
  serviceFit: string;
  urgencySignals: string | null;
  budget: string | null;
  companyName: string | null;
  personName: string | null;
  platformUsername: string | null;
  contactChannels: Array<{
    type: 'email' | 'platform_message' | 'contact_form' | 'phone' | 'social';
    label: string;
    value: string;
    verified: boolean;
  }>;
}

export function matchesServiceKeywords(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return TARGET_SERVICE_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Classifies post text and extracts factual details without invention.
 */
export async function classifyPostText(params: {
  postText: string;
  postUrl: string;
  sourcePlatform: string;
  authorName?: string;
  authorUsername?: string;
}): Promise<ExtractedRequestData> {
  const { postText, postUrl, sourcePlatform, authorName, authorUsername } = params;

  // 1. Pre-filter
  if (!matchesServiceKeywords(postText)) {
    return {
      isRelevant: false,
      matchScore: 10,
      needSummary: 'Not matching target automation or AI developer services',
      exactQuote: postText.slice(0, 150).trim(),
      serviceFit: 'Unrelated',
      urgencySignals: null,
      budget: null,
      companyName: null,
      personName: authorName || null,
      platformUsername: authorUsername || null,
      contactChannels: [],
    };
  }

  // Check if Gemini API key exists
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      return await classifyWithGemini(postText, geminiKey, sourcePlatform, postUrl, authorName, authorUsername);
    } catch (err) {
      console.warn('Gemini classification failed; falling back to deterministic extractor:', err);
    }
  }

  // 2. Deterministic rule-based extractor
  return extractDeterministically(postText, postUrl, sourcePlatform, authorName, authorUsername);
}

function extractDeterministically(
  postText: string,
  postUrl: string,
  sourcePlatform: string,
  authorName?: string,
  authorUsername?: string
): ExtractedRequestData {
  const lower = postText.toLowerCase();

  // Extract public emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails = Array.from(new Set(postText.match(emailRegex) || [])).filter(
    e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com')
  );

  // Extract public phone numbers
  const phoneRegex = /(?:\+?44|0|\+?1)?(?:\s*\(?0?\d{1,4}\)?\s*[\d\s-]{6,12})/g;
  const phones = (postText.match(phoneRegex) || []).map(p => p.trim()).filter(p => p.length >= 9 && p.length <= 16);

  // Extract budget if explicitly stated
  let budget: string | null = null;
  const budgetMatch = postText.match(/(\$\d+[\d,]*|\£\d+[\d,]*|\€\d+[\d,]*|\d+k\s*-\s*\d+k|\$\d+\s*\/?\s*hr)/i);
  if (budgetMatch) {
    budget = budgetMatch[0].trim();
  }

  // Extract urgency signals if stated
  let urgencySignals: string | null = null;
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately') || lower.includes('this week')) {
    urgencySignals = 'High urgency (ASAP / immediate requirement)';
  }

  // Extract company name if stated
  let companyName: string | null = null;
  const atCompanyMatch = postText.match(/(?:at|from|with|company:)\s+([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*)/);
  if (atCompanyMatch) {
    companyName = atCompanyMatch[1].trim();
  }

  // Exact verbatim quote (must be copied verbatim, max 200 chars)
  let exactQuote = '';
  const sentences = postText.split(/(?<=[.?!])\s+/);
  const relevantSentence = sentences.find(s => matchesServiceKeywords(s)) || sentences[0] || postText;
  exactQuote = relevantSentence.trim().slice(0, 195);

  // Service fit classification
  let serviceFit = 'AI & Web Automation';
  let matchScore = 70;

  if (lower.includes('n8n') || lower.includes('make.com') || lower.includes('zapier')) {
    serviceFit = 'Workflow Automation (n8n / Make / Zapier)';
    matchScore = 88;
  } else if (lower.includes('llm') || lower.includes('rag') || lower.includes('chatbot') || lower.includes('openai')) {
    serviceFit = 'AI & LLM Integration (RAG / Chatbot)';
    matchScore = 92;
  } else if (lower.includes('python') || lower.includes('scraping') || lower.includes('pipeline')) {
    serviceFit = 'Python & Data Engineering';
    matchScore = 85;
  } else if (lower.includes('website') || lower.includes('web app') || lower.includes('next.js')) {
    serviceFit = 'Web Development & Web Applications';
    matchScore = 80;
  }

  if (budget) matchScore = Math.min(100, matchScore + 5);
  if (urgencySignals) matchScore = Math.min(100, matchScore + 5);

  // Need summary (plain English, max 25 words)
  const needWords = `Client requires assistance with ${serviceFit.toLowerCase()} based on their public request.`.split(' ');
  const needSummary = needWords.slice(0, 24).join(' ');

  // Contact channels
  const contactChannels: ExtractedRequestData['contactChannels'] = [];

  if (emails.length > 0) {
    contactChannels.push({
      type: 'email',
      label: 'Public Email',
      value: emails[0].toLowerCase(),
      verified: false,
    });
  }

  contactChannels.push({
    type: 'platform_message',
    label: `Respond on ${sourcePlatform}`,
    value: postUrl,
    verified: true,
  });

  if (phones.length > 0) {
    contactChannels.push({
      type: 'phone',
      label: 'Public Phone',
      value: phones[0],
      verified: false,
    });
  }

  return {
    isRelevant: true,
    matchScore,
    needSummary,
    exactQuote,
    serviceFit,
    urgencySignals,
    budget,
    companyName,
    personName: authorName || null,
    platformUsername: authorUsername || null,
    contactChannels,
  };
}

async function classifyWithGemini(
  postText: string,
  apiKey: string,
  sourcePlatform: string,
  postUrl: string,
  authorName?: string,
  authorUsername?: string
): Promise<ExtractedRequestData> {
  const prompt = `You are a strict data extraction engine for a software & automation developer.
Evaluate this public post and extract facts ONLY. Do NOT invent companies, budgets, or problems.

Post Text:
"""
${postText.slice(0, 2000)}
"""

Return JSON with exact keys:
{
  "isRelevant": boolean,
  "matchScore": number (0-100),
  "needSummary": string (max 25 plain English words summarizing the need),
  "exactQuote": string (verbatim excerpt from post, max 190 characters),
  "serviceFit": string (e.g. "Workflow Automation", "AI & LLM Integration", "Python & Data", "Web Development"),
  "urgencySignals": string or null (only if stated),
  "budget": string or null (only if stated),
  "companyName": string or null,
  "personName": string or null
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini HTTP error ${res.status}`);
  }

  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty Gemini response');

  const parsed = JSON.parse(rawText);

  // Guarantee verbatim exact quote from original text
  let quote = (parsed.exactQuote || '').trim();
  if (!postText.includes(quote) || quote.length === 0) {
    quote = postText.slice(0, 180).trim();
  }

  // Guarantee need summary <= 25 words
  const summaryWords = (parsed.needSummary || 'Software and automation development assistance').split(/\s+/);
  const needSummary = summaryWords.slice(0, 24).join(' ');

  // Extract emails and links
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails = Array.from(new Set(postText.match(emailRegex) || []));

  const contactChannels: ExtractedRequestData['contactChannels'] = [];
  if (emails.length > 0) {
    contactChannels.push({
      type: 'email',
      label: 'Public Email',
      value: emails[0].toLowerCase(),
      verified: false,
    });
  }
  contactChannels.push({
    type: 'platform_message',
    label: `Respond on ${sourcePlatform}`,
    value: postUrl,
    verified: true,
  });

  return {
    isRelevant: Boolean(parsed.isRelevant),
    matchScore: Math.min(100, Math.max(0, parsed.matchScore || 70)),
    needSummary,
    exactQuote: quote.slice(0, 195),
    serviceFit: parsed.serviceFit || 'AI & Web Automation',
    urgencySignals: parsed.urgencySignals || null,
    budget: parsed.budget || null,
    companyName: parsed.companyName || null,
    personName: parsed.personName || authorName || null,
    platformUsername: authorUsername || null,
    contactChannels,
  };
}
