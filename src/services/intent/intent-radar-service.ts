import { IntentOpportunityEntity, IntentPlatform } from '@/types';
import { HackerNewsAdapter } from './adapters/hacker-news-adapter';
import { RedditAdapter } from './adapters/reddit-adapter';
import { RemoteFeedsAdapter } from './adapters/remote-feeds-adapter';
import { classifyRawIntentPost } from './intent-classifier';
import { generateIntentPitch } from './intent-pitch-engine';

export class IntentRadarService {
  private hnAdapter = new HackerNewsAdapter();
  private redditAdapter = new RedditAdapter();
  private remoteFeedsAdapter = new RemoteFeedsAdapter();
  private storedOpportunities: Map<string, IntentOpportunityEntity> = new Map();

  constructor() {
    this.seedBaselineWarmOpportunities();
  }

  /**
   * Dispatches live queries across developer communities and hiring feeds
   */
  public async scanLiveIntentFeeds(): Promise<{
    scannedCount: number;
    hotOpportunitiesCount: number;
    opportunities: IntentOpportunityEntity[];
  }> {
    const rawList: Array<{
      platform: IntentPlatform;
      sourceUrl: string;
      sourceIdentifier?: string;
      title: string;
      rawText: string;
      postedAt: string;
      author?: string;
    }> = [];

    // 1. Hacker News
    const hnPosts = await this.hnAdapter.fetchRecentHiringPosts();
    for (const p of hnPosts) {
      rawList.push({
        platform: 'hacker_news',
        sourceUrl: p.url,
        sourceIdentifier: p.id,
        title: p.title,
        rawText: p.text,
        postedAt: p.createdAt,
        author: p.author,
      });
    }

    // 2. Reddit
    const redditPosts = await this.redditAdapter.fetchRecentHiringPosts();
    for (const r of redditPosts) {
      rawList.push({
        platform: 'reddit',
        sourceUrl: r.url,
        sourceIdentifier: r.id,
        title: r.title,
        rawText: r.text,
        postedAt: r.createdAt,
        author: r.author,
      });
    }

    // 3. Remotive
    const remoteJobs = await this.remoteFeedsAdapter.fetchRecentJobs();
    for (const j of remoteJobs) {
      rawList.push({
        platform: 'remotive',
        sourceUrl: j.url,
        sourceIdentifier: j.id,
        title: `${j.company}: ${j.title}`,
        rawText: `${j.description} Tags: ${j.tags.join(', ')}`,
        postedAt: j.createdAt,
        author: j.company,
      });
    }

    // 4. Classify and Generate Pitches
    let hotCount = 0;
    for (const raw of rawList) {
      const opp = classifyRawIntentPost(raw);
      if (opp.isLegitimate && opp.fitScore >= 50) {
        const pitchData = generateIntentPitch(opp);
        opp.tailoredPitch = pitchData.pitchText;
        opp.pitchWordCount = pitchData.wordCount;

        this.storedOpportunities.set(opp.id, opp);
        if (opp.fitScore >= 80) hotCount++;
      }
    }

    return {
      scannedCount: rawList.length,
      hotOpportunitiesCount: hotCount,
      opportunities: this.getHotOpportunities(),
    };
  }

  /**
   * Manual Quick Add (Section 5): Paste post URL/text from LinkedIn, Discord, Upwork
   */
  public quickAddManualLead(params: {
    sourceUrl: string;
    rawText: string;
    platform: IntentPlatform;
    authorOrPoster?: string;
    statedTitle?: string;
  }): IntentOpportunityEntity {
    const opp = classifyRawIntentPost({
      platform: params.platform,
      sourceUrl: params.sourceUrl,
      title: params.statedTitle || `${params.platform.replace('_', ' ').toUpperCase()} Lead: ${params.rawText.slice(0, 50)}...`,
      rawText: params.rawText,
      postedAt: new Date().toISOString(),
      author: params.authorOrPoster || 'Direct Manual Lead',
    });

    opp.isManualImport = true;
    const pitchData = generateIntentPitch(opp);
    opp.tailoredPitch = pitchData.pitchText;
    opp.pitchWordCount = pitchData.wordCount;

    this.storedOpportunities.set(opp.id, opp);
    return opp;
  }

  public getHotOpportunities(limit: number = 50): IntentOpportunityEntity[] {
    return Array.from(this.storedOpportunities.values())
      .filter(o => o.isLegitimate)
      .sort((a, b) => {
        // Sort by Fit Score x Freshness
        const scoreA = a.fitScore * 0.7 + a.legitimacyScore * 0.3;
        const scoreB = b.fitScore * 0.7 + b.legitimacyScore * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  public getOpportunityById(id: string): IntentOpportunityEntity | null {
    return this.storedOpportunities.get(id) || null;
  }

  public updateOpportunityStatus(id: string, status: any): boolean {
    const opp = this.storedOpportunities.get(id);
    if (!opp) return false;
    opp.status = status;
    if (status === 'pitched') {
      opp.contactedAt = new Date().toISOString();
    }
    this.storedOpportunities.set(id, opp);
    return true;
  }

  /**
   * Seeds realistic warm opportunities for development and testing
   */
  private seedBaselineWarmOpportunities(): void {
    const seed1 = classifyRawIntentPost({
      platform: 'reddit',
      sourceUrl: 'https://reddit.com/r/forhire/comments/example1',
      sourceIdentifier: 'rd_seed_1',
      title: '[Hiring] Need an expert to build an automated RAG customer support chatbot in Python',
      rawText: 'We run a boutique SaaS product and our support queue is overflowing. Looking for a Python developer with LangChain or LlamaIndex experience to build a RAG agent trained on our API docs and knowledge base. Budget: $3,000 - $5,000. Need to start immediately. Contact via DM or email alex@saaslaunch.co',
      postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      author: 'u/saas_founder_alex',
    });
    const pitch1 = generateIntentPitch(seed1);
    seed1.tailoredPitch = pitch1.pitchText;
    seed1.pitchWordCount = pitch1.wordCount;
    this.storedOpportunities.set(seed1.id, seed1);

    const seed2 = classifyRawIntentPost({
      platform: 'hacker_news',
      sourceUrl: 'https://news.ycombinator.com/item?id=example2',
      sourceIdentifier: 'hn_seed_2',
      title: 'Ask HN: Freelancer? Seeking Freelancer? (Python & Data Engineering)',
      rawText: 'Our logistics analytics firm needs an experienced Python / FastAPI engineer for a 2-week sprint to build data pipeline automations and connect to external carrier APIs. Full remote, flexible hours.',
      postedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      author: 'logistics_tech_lead',
    });
    const pitch2 = generateIntentPitch(seed2);
    seed2.tailoredPitch = pitch2.pitchText;
    seed2.pitchWordCount = pitch2.wordCount;
    this.storedOpportunities.set(seed2.id, seed2);

    const seed3 = classifyRawIntentPost({
      platform: 'upwork_manual',
      sourceUrl: 'https://upwork.com/jobs/~01example3',
      sourceIdentifier: 'up_seed_3',
      title: 'Full Stack Next.js & Supabase Developer for B2B Client Portal',
      rawText: 'Looking for a senior TypeScript / Next.js developer to implement our client onboarding dashboard with Supabase auth and Stripe billing. Must be available this week.',
      postedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
      author: 'US Digital Studio',
    });
    const pitch3 = generateIntentPitch(seed3);
    seed3.tailoredPitch = pitch3.pitchText;
    seed3.pitchWordCount = pitch3.wordCount;
    this.storedOpportunities.set(seed3.id, seed3);
  }
}

export const intentRadarService = new IntentRadarService();

