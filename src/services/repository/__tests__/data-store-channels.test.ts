import { describe, it, expect, beforeEach } from 'vitest';
import { inMemoryDataStore as dataStore } from '../data-store';

describe('DataStore Alternative Channels & Specialized Queries', () => {
  beforeEach(() => {
    dataStore.resetToSeedData();
  });

  it('correctly retrieves worldwide leads with country and pipeline filters', () => {
    const allLeads = dataStore.getWorldwideLeads();
    expect(allLeads.length).toBeGreaterThanOrEqual(4);

    const ukLeads = dataStore.getWorldwideLeads({ country: 'UK' });
    expect(ukLeads.length).toBeGreaterThanOrEqual(1);
    expect(ukLeads.every(b => b.country === 'UK')).toBe(true);

    const pipeALeads = dataStore.getWorldwideLeads({ pipeline: 'website_opportunities' });
    expect(pipeALeads.every(b => b.pipelineType === 'website_opportunities')).toBe(true);
  });

  it('returns contacts ready for email with full eligibility explanations', () => {
    const ready = dataStore.getReadyForEmailLeads();
    expect(ready.length).toBeGreaterThanOrEqual(1);

    const first = ready[0];
    expect(first.business).toBeDefined();
    expect(first.contact.email).toContain('@');
    expect(first.score.overallScore).toBeGreaterThanOrEqual(60);
    expect(first.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it('retrieves sent email history with Gmail message references', () => {
    const sent = dataStore.getSentEmails();
    expect(sent.length).toBeGreaterThanOrEqual(1);

    const finflow = sent.find(s => s.businessName.includes('FinFlow'));
    expect(finflow).toBeDefined();
    expect(finflow?.gmailMessageId).toBe('1928374a5b6c7d8e');
    expect(finflow?.gmailUrl).toContain('https://mail.google.com/mail/u/0/#sent/');
  });

  it('retrieves businesses with alternative channels and allows status updates', () => {
    const opps = dataStore.getOtherOutreachOpportunities();
    expect(opps.length).toBeGreaterThanOrEqual(2);

    const sample = opps[0];
    expect(sample.channels.length).toBeGreaterThanOrEqual(1);

    const ch = sample.channels[0];
    const updated = dataStore.updateAlternativeChannelStatus(ch.id, 'manually_contacted', '2026-11-05', 'Followed up via LinkedIn message');
    expect(updated).toBe(true);

    const fetched = dataStore.getAlternativeChannelById(ch.id);
    expect(fetched?.status).toBe('manually_contacted');
    expect(fetched?.notes).toContain('LinkedIn message');
  });

  it('retrieves emailed businesses that also have verified alternative channels (multi-touch)', () => {
    const multi = dataStore.getEmailSentPlusOtherChannels();
    expect(multi.length).toBeGreaterThanOrEqual(1);

    const entry = multi[0];
    expect(entry.draft.status).toBe('sent');
    expect(entry.channels.length).toBeGreaterThanOrEqual(1);
  });

  it('identifies businesses with no usable email and preserves their channels', () => {
    const noEmail = dataStore.getNoEmailBusinesses();
    expect(noEmail.length).toBeGreaterThanOrEqual(1);

    const blueRidge = noEmail.find(b => b.business.name.includes('Blue Ridge'));
    expect(blueRidge).toBeDefined();
    expect(blueRidge?.channels.length).toBeGreaterThanOrEqual(1);
  });
});

