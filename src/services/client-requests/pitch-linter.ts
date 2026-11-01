/**
 * Pitch Linter & Claim-Check Engine
 * Strictly enforces human-sounding, honest pitches and rejects buzzwords / AI clichés.
 */

export const FORBIDDEN_PHRASES = [
  'i hope this email finds you well',
  'i hope all is well',
  'i came across your profile',
  'i came across your post',
  'i am writing to',
  "i'm writing to",
  'synergy',
  'game-changer',
  'game changer',
  'leverage',
  'cutting-edge',
  'cutting edge',
  'unlock',
  'revolutionize',
  'guaranteed',
  'guarantee',
  'just following up',
  'as an ai',
  'as an ai language model',
  'touch base',
  'circle back',
  'reach out',
  'act now',
  'limited time',
  'exclusive offer',
  'spearhead',
  'state-of-the-art',
  'deep dive',
];

export interface PitchLintResult {
  passed: boolean;
  violations: string[];
  wordCount: number;
  readAloudPassed: boolean;
  longestSentenceLength: number;
}

export function lintPitchText(text: string, options?: { maxWords?: number; minWords?: number }): PitchLintResult {
  const violations: string[] = [];
  const lower = text.toLowerCase();

  // 1. Check forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      violations.push(`Contains forbidden cliché/buzzword: "${phrase}"`);
    }
  }

  // 2. Check em-dash overuse
  const emDashCount = (text.match(/—|--/g) || []).length;
  if (emDashCount > 2) {
    violations.push(`Excessive em-dashes (${emDashCount}). Maximum allowed is 2.`);
  }

  // 3. Word count check
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (options?.maxWords && wordCount > options.maxWords) {
    violations.push(`Word count (${wordCount}) exceeds maximum of ${options.maxWords} words.`);
  }
  if (options?.minWords && wordCount < options.minWords) {
    violations.push(`Word count (${wordCount}) is below minimum of ${options.minWords} words.`);
  }

  // 4. Read-aloud test: Check sentence lengths (no sentence over 25 words)
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  let longestSentenceLength = 0;
  let readAloudPassed = true;

  for (const sentence of sentences) {
    const sWords = sentence.split(/\s+/).filter(Boolean).length;
    if (sWords > longestSentenceLength) {
      longestSentenceLength = sWords;
    }
    if (sWords > 25) {
      readAloudPassed = false;
      violations.push(`Read-aloud failure: sentence has ${sWords} words (max permitted is 25): "${sentence.slice(0, 50)}..."`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    wordCount,
    readAloudPassed,
    longestSentenceLength,
  };
}

/**
 * Claim-checker: verifies that claims about the client appear in the stored quote/evidence,
 * and claims about the operator appear in operator_profile.
 */
export function verifyPitchClaims(params: {
  pitchText: string;
  clientQuote: string;
  operatorProfile?: { services?: string; bio?: string; yearsOfExperience?: string };
}): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const lower = params.pitchText.toLowerCase();

  // Check for invented website inspection claims
  if (lower.includes('looked at your website') || lower.includes('saw your code') || lower.includes('reviewed your repo')) {
    warnings.push('Unverified claim: do not claim to have inspected their codebase or internal site unless proven.');
  }

  // Check for invented years of experience if not in profile
  const yearsMatch = lower.match(/(\d+)\+?\s*years/);
  if (yearsMatch) {
    const claimed = yearsMatch[0];
    const profileYears = (params.operatorProfile?.yearsOfExperience || '').toLowerCase();
    if (!profileYears.includes(yearsMatch[1])) {
      warnings.push(`Unverified claim: mentioned "${claimed}" of experience not found in My Profile.`);
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
  };
}
