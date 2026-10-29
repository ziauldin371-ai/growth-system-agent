import { describe, it, expect } from 'vitest';
import { classifyRawIntentPost } from '../intent-classifier';
import { generateIntentPitch } from '../intent-pitch-engine';
import { intentRadarService } from '../intent-radar-service';

describe('Add-On 3 — Intent-Based Lead Radar & Classification Engine', () => {
  it('correctly classifies an explicit hire request for Python RAG chatbot', () => {
    const rawPost = {
      platform: 'reddit' as const,
      sourceUrl: 'https://reddit.com/r/forhire/comments/test1',
      title: '[Hiring] Looking for Python developer to build RAG chatbot with LangChain',
      rawText: 'We need an experienced Python developer to build a RAG knowledge base chatbot for our team. Budget is $2,500 - $4,000. Need to start this week. Contact me at devlead@techcorp.io',
      postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      author: 'u/techfounder',
    };

    const opp = classifyRawIntentPost(rawPost);

    expect(opp.intentType).toBe('explicit_hire_request');
    expect(opp.neededSkills).toContain('python');
    expect(opp.neededSkills).toContain('rag');
    expect(opp.statedBudget).toContain('$2,500');
    expect(opp.urgency).toBe('immediate');
    expect(opp.fitScore).toBeGreaterThanOrEqual(75);
    expect(opp.isLegitimate).toBe(true);
    expect(opp.replyRoute).toBe('email');
    expect(opp.posterContactInfo?.email).toBe('devlead@techcorp.io');
  });

  it('detects and flags scam and exploitative posts', () => {
    const scamPost = {
      platform: 'reddit' as const,
      sourceUrl: 'https://reddit.com/r/forhire/comments/scam1',
      title: '[Hiring] Easy AI Assistant - $1,000 daily',
      rawText: 'Earn money while you sleep! Deposit first $50 registration fee via Western Union or wire money to get your training materials. Send passport photo scan to verify identity.',
      postedAt: new Date().toISOString(),
      author: 'u/crypto_scammer',
    };

    const opp = classifyRawIntentPost(scamPost);

    expect(opp.isLegitimate).toBe(false);
    expect(opp.legitimacyScore).toBeLessThan(60);
    expect(opp.scamWarningFlags.length).toBeGreaterThanOrEqual(2);
    expect(opp.scamWarningFlags.some(f => f.includes('upfront payment') || f.includes('fee'))).toBe(true);
  });

  it('generates a compliant, concise public reply for Reddit within 90 words', () => {
    const opp = classifyRawIntentPost({
      platform: 'reddit' as const,
      sourceUrl: 'https://reddit.com/r/LocalLLaMA/comments/query1',
      title: 'How can I build an automated document search agent locally with Ollama?',
      rawText: 'Looking for advice or developer help setting up local RAG embeddings and python automation.',
      postedAt: new Date().toISOString(),
      author: 'u/localllama_fan',
    });

    const pitch = generateIntentPitch(opp);

    expect(pitch.pitchMode).toBe('public_reply');
    expect(pitch.wordCount).toBeLessThanOrEqual(95);
    expect(pitch.pitchText).toContain('Full Stack AI Developer');
    expect(pitch.clarifyingQuestion).toBeDefined();
    expect(pitch.communityComplianceCheck.passed).toBe(true);
  });

  it('generates a structured marketplace proposal for Upwork leads', () => {
    const opp = classifyRawIntentPost({
      platform: 'upwork_manual' as const,
      sourceUrl: 'https://upwork.com/jobs/sample',
      title: 'Full Stack Next.js & Supabase Automation App',
      rawText: 'We need a senior full-stack developer to build an internal dashboard with TypeScript, Next.js, and Supabase.',
      postedAt: new Date().toISOString(),
      author: 'Enterprise Client',
    });

    const pitch = generateIntentPitch(opp);

    expect(pitch.pitchMode).toBe('marketplace_proposal');
    expect(pitch.pitchText).toContain('Here is how I would structure this sprint');
    expect(pitch.pitchText).toContain('Architecture & Schema');
    expect(pitch.pitchText).toContain('Zia Ul Din');
    expect(pitch.wordCount).toBeGreaterThanOrEqual(80);
    expect(pitch.wordCount).toBeLessThanOrEqual(180);
  });

  it('imports and classifies manual paste leads via Quick Add', () => {
    const manualLead = intentRadarService.quickAddManualLead({
      sourceUrl: 'https://linkedin.com/posts/founder-need-ai',
      rawText: 'Our venture studio needs an AI automation architect to build autonomous LLM workflows and custom Python APIs for our portfolio companies.',
      platform: 'linkedin_manual',
      authorOrPoster: 'Sarah Connor (Venture Studio Partner)',
    });

    expect(manualLead.isManualImport).toBe(true);
    expect(manualLead.sourcePlatform).toBe('linkedin_manual');
    expect(manualLead.neededSkills.length).toBeGreaterThan(0);
    expect(manualLead.tailoredPitch).toBeDefined();
    expect(manualLead.fitScore).toBeGreaterThanOrEqual(60);
  });
});
