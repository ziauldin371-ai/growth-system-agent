import { describe, it, expect } from 'vitest';
import { extractLeadFromPost, generateBookmarkletCode, parseCsvIntake } from '../manual-intake';

describe('Manual Intake & Bookmarklet Generators', () => {
  it('extracts lead and channels from a raw post', async () => {
    const rawPost = `Hey everyone, our team at NovaTech needs help setting up Zapier and Make automations for our customer onboarding. Reach out to founder@novatech.io or DM me here. Budget is around $2,000.`;
    const lead = await extractLeadFromPost(rawPost, 'https://linkedin.com/feed/update/urn:li:activity:999', 'LinkedIn');

    expect(lead.companyName).toBe('NovaTech');
    expect(lead.sourcePlatform).toBe('LinkedIn');
    expect(lead.matchScore).toBeGreaterThanOrEqual(70);
    expect(lead.channels?.some(c => c.type === 'email' && c.value === 'founder@novatech.io')).toBe(true);
  });

  it('generates valid javascript bookmarklet code pointing to /capture', () => {
    const code = generateBookmarkletCode('https://growth-system-agent-brown.vercel.app');
    expect(code.startsWith('javascript:')).toBe(true);
    expect(code).toContain('/capture');
    expect(code).toContain('window.open');
  });

  it('parses CSV rows with suppression and deduplication checks', async () => {
    const csv = `Platform,Company,Post URL,Need / Problem,Contact Email
Upwork,Beta Corp,https://upwork.com/jobs/~01abc,Need Python scraper for real estate data,jobs@betacorp.com
Reddit,Gamma Labs,https://reddit.com/r/forhire/123,Looking for Next.js and Tailwind website developer,founder@gammalabs.io`;

    const leads = await parseCsvIntake(csv);
    expect(leads.length).toBe(2);
    expect(leads[0].companyName).toBe('Beta Corp');
    expect(leads[1].companyName).toBe('Gamma Labs');
  });
});
