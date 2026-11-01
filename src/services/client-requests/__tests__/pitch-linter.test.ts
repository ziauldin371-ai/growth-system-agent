import { describe, it, expect } from 'vitest';
import { lintPitchText, verifyPitchClaims } from '../pitch-linter';

describe('Pitch Linter & Quality Verification', () => {
  it('passes on clean, professional, human-sounding pitches under 25 words per sentence', () => {
    const cleanPitch = `Hi Alex,

I saw your post about automating order syncing between Shopify and QuickBooks. I build reliable n8n and Python integrations for small businesses.

Would you be open to a 10-minute chat this week?

Best,
Zia Ul Din
Islamabad, Pakistan
Reply 'stop' to unsubscribe`;

    const result = lintPitchText(cleanPitch);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.readAloudPassed).toBe(true);
  });

  it('flags forbidden hype and clichés', () => {
    const hypePitch = `I hope this email finds you well. Our cutting-edge solution is a game-changer that will unlock synergistic ROI with 100% guaranteed results. As an AI engineer, let us revolutionize your pipeline.`;

    const result = lintPitchText(hypePitch);
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.includes('cliché'))).toBe(true);
  });

  it('fails read-aloud test when a sentence exceeds 25 words', () => {
    const longSentencePitch = `We are an exceptional software development agency operating internationally with over a decade of hands-on expertise building scalable microservice architectures and custom database pipelines across many diverse commercial sectors. Let us talk.`;

    const result = lintPitchText(longSentencePitch);
    expect(result.passed).toBe(false);
    expect(result.readAloudPassed).toBe(false);
    expect(result.violations.some(v => v.toLowerCase().includes('read-aloud'))).toBe(true);
  });

  it('verifies claims against quote and operator profile without hallucination', () => {
    const quote = 'Looking for an experienced developer to connect Shopify with QuickBooks using n8n or Python';
    const profileServices = 'AI automation, n8n, Make, Python, web development';

    const truthful = verifyPitchClaims({
      pitchText: 'I saw you need Shopify to QuickBooks synced with n8n or Python. I build these workflows.',
      clientQuote: quote,
      operatorProfile: { services: profileServices },
    });

    const unverified = verifyPitchClaims({
      pitchText: 'I looked at your website and code and saw 10+ years of experience needed.',
      clientQuote: quote,
      operatorProfile: { services: profileServices, yearsOfExperience: '4 years' },
    });

    expect(truthful.passed).toBe(true);
    expect(unverified.passed).toBe(false);
  });
});
