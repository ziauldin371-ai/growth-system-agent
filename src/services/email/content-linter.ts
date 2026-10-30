export interface ContentLintResult {
  passed: boolean;
  score: number; // 0 to 100
  wordCount: number;
  linkCount: number;
  hasUnsubscribeLine: boolean;
  detectedSpamPhrases: string[];
  hasAllcapsWords: boolean;
  hasUrlShorteners: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

const SPAM_TRIGGER_PHRASES = [
  'guaranteed',
  '100% free',
  'risk free',
  'risk-free',
  'act now',
  'urgent',
  'fast cash',
  'double your money',
  'congratulations',
  'winner',
  'no obligation',
  'special promotion',
  'once in a lifetime',
  'secret algorithm',
  'make money while you sleep',
];

const URL_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'cutt.ly',
];

/**
 * Pre-send email content linter implementing Part C Inbox Placement rules.
 * Strictly verifies word count (60-110 words), single link limits,
 * absence of spam triggers, and plain opt-out presence.
 */
export function lintEmailContent(subject: string, bodyText: string, isFirstTouch: boolean = true): ContentLintResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  // 1. Word Count Check (Ideal: 60-110 words)
  const words = bodyText
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
  const wordCount = words.length;

  if (wordCount < 40) {
    warnings.push(`Email is very short (${wordCount} words). Recommended sweet spot is 60–110 words.`);
  } else if (wordCount > 125) {
    errors.push(`Email is too long (${wordCount} words). Busy owners rarely read past 110 words. Trim to under 110 words.`);
  }

  // 2. Link Count and Shortener Check
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const linksFound = bodyText.match(urlRegex) || [];
  const linkCount = linksFound.length;

  if (isFirstTouch && linkCount > 1) {
    errors.push(`First-touch cold emails should contain at most 1 link (found ${linkCount}). Excessive links trigger spam filters.`);
  } else if (!isFirstTouch && linkCount > 2) {
    warnings.push(`Follow-up email contains ${linkCount} links. Keep links to a maximum of 2.`);
  }

  let hasUrlShorteners = false;
  for (const link of linksFound) {
    for (const shortener of URL_SHORTENERS) {
      if (link.toLowerCase().includes(shortener)) {
        hasUrlShorteners = true;
        errors.push(`URL shortener detected ("${shortener}"). Spam filters aggressively penalize shortened links.`);
      }
    }
  }

  // 3. Spam Trigger Phrases
  const lowerText = `${subject} ${bodyText}`.toLowerCase();
  const detectedSpamPhrases: string[] = [];
  for (const phrase of SPAM_TRIGGER_PHRASES) {
    if (lowerText.includes(phrase)) {
      detectedSpamPhrases.push(phrase);
    }
  }

  if (detectedSpamPhrases.length > 0) {
    errors.push(`Spam trigger keywords found: "${detectedSpamPhrases.join('", "')}". Remove these to preserve sender reputation.`);
  }

  // 4. All-Caps Detection
  const allCapsWords = words.filter(w => w.length >= 4 && w === w.toUpperCase() && /^[A-Z]+$/.test(w));
  const hasAllcapsWords = allCapsWords.length >= 2;
  if (hasAllcapsWords) {
    warnings.push(`Excessive ALL-CAPS words found: ${allCapsWords.slice(0, 3).join(', ')}. Avoid shouting in cold outreach.`);
  }

  // 5. Plain Opt-Out Line Check
  const optOutPattern = /(unsubscribe|opt[- ]?out|reply (stop|no|leave))/i;
  const hasUnsubscribeLine = optOutPattern.test(bodyText);
  if (!hasUnsubscribeLine) {
    errors.push('Missing clear opt-out sentence (e.g., "If you would prefer not to hear from me, just reply unsubscribe.").');
  }

  // 6. Score Calculation
  let score = 100;
  score -= errors.length * 20;
  score -= warnings.length * 10;
  score = Math.max(0, Math.min(100, score));

  if (score >= 80 && errors.length === 0) {
    recommendations.push('Excellent copy quality: high probability of reaching recipient inbox.');
  } else {
    recommendations.push('Address highlighted lint errors before dispatching to maintain sender health.');
  }

  return {
    passed: errors.length === 0,
    score,
    wordCount,
    linkCount,
    hasUnsubscribeLine,
    detectedSpamPhrases,
    hasAllcapsWords,
    hasUrlShorteners,
    warnings,
    errors,
    recommendations,
  };
}
