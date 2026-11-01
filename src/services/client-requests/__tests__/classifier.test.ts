import { describe, it, expect } from 'vitest';
import { matchesServiceKeywords, classifyPostText } from '../classifier';

describe('Classifier & Skill Prefilter', () => {
  it('correctly matches target developer skills', () => {
    expect(matchesServiceKeywords('We need an n8n workflow to sync our leads to HubSpot')).toBe(true);
    expect(matchesServiceKeywords('Looking for a Python developer for ML data pipeline')).toBe(true);
    expect(matchesServiceKeywords('Need a modern Next.js and Tailwind website for our legal practice')).toBe(true);
    expect(matchesServiceKeywords('Hiring an executive administrative assistant in New York')).toBe(false);
  });

  it('classifies posts deterministically without hallucination', async () => {
    const postText = `Acme Logistics: Looking for a freelance engineer to build an automated n8n webhook listener that pushes tracking numbers into PostgreSQL. Contact us at ops@acmelogistics.com or on Twitter @acme_ops.`;
    const classification = await classifyPostText({
      postText,
      postUrl: 'https://news.ycombinator.com/item?id=123',
      sourcePlatform: 'Hacker News',
    });

    expect(classification.matchScore).toBeGreaterThanOrEqual(50);
    expect(classification.exactQuote.length).toBeGreaterThan(10);
    expect(classification.exactQuote.length).toBeLessThanOrEqual(200);
    expect(classification.needSummary.length).toBeGreaterThan(5);
    expect(classification.contactChannels.some(c => c.type === 'email' && c.value === 'ops@acmelogistics.com')).toBe(true);
  });
});
