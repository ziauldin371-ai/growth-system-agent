import { describe, it, expect } from 'vitest';
import { lintEmailContent } from '../content-linter';

describe('Part C — Email Content Linter & Inbox Placement Guard', () => {
  it('passes high-quality, concise cold email with valid unsubscribe note', () => {
    const subject = 'Quick question regarding dental booking automation';
    const body = `Hi Dr. Jenkins,

Saw your expansion in Leeds. Most dental clinics in your area still use manual phone booking, which often leaks high-value weekend appointments.

As an AI & Automation Architect, I build simple booking bots that sync directly with clinic schedules in 10 days.

Would you be open to a 2-minute diagnostic exchange?

Best regards,
Zia Ul Din

If you would prefer not to receive updates, reply unsubscribe.`;

    const result = lintEmailContent(subject, body, true);
    expect(result.passed).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.hasUnsubscribeLine).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.wordCount).toBeGreaterThanOrEqual(60);
    expect(result.wordCount).toBeLessThanOrEqual(110);
  });

  it('rejects copy with spam trigger keywords and URL shorteners', () => {
    const subject = '100% Free Guaranteed Fast Cash';
    const body = `ACT NOW! This is a risk-free once in a lifetime opportunity to make money while you sleep.
Click here: http://bit.ly/secret-ai-rich`;

    const result = lintEmailContent(subject, body, true);
    expect(result.passed).toBe(false);
    expect(result.detectedSpamPhrases.length).toBeGreaterThan(0);
    expect(result.hasUrlShorteners).toBe(true);
    expect(result.hasUnsubscribeLine).toBe(false);
  });

  it('flags emails exceeding word count threshold (> 125 words)', () => {
    const longBody = Array(130).fill('word').join(' ') + '\nReply unsubscribe to opt out.';
    const result = lintEmailContent('Check this out', longBody, true);
    expect(result.passed).toBe(false);
    expect(result.errors.some(e => e.includes('too long'))).toBe(true);
  });
});
