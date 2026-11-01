/**
 * Client Requests Pipeline Runner
 * Runs inside the twice-daily scheduler and manual "Run now" scans.
 */

import crypto from 'crypto';
import { collectTierAPosts, RawPublicPost } from './connectors/tier-a-collector';
import { classifyPostText } from './classifier';
import { generatePitches } from './pitch-generator';
import { dataStore } from '@/services/repository/data-store';
import { ClientRequestEntity, RequestChannelEntity, RequestPitchEntity } from '@/types';

export interface PipelineScanResult {
  runId: string;
  startedAt: string;
  finishedAt: string;
  totalFetched: number;
  relevantFound: number;
  newLeadsCreated: number;
  perSourceStats: Record<string, { fetched: number; relevant: number; error?: string }>;
  topLeads: ClientRequestEntity[];
}

export async function runClientRequestsScan(options?: {
  sources?: string[];
  limitPerSource?: number;
  minScore?: number;
}): Promise<PipelineScanResult> {
  const runId = `req-scan-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const minScore = options?.minScore || 50;

  console.log(`[CLIENT_REQUESTS_PIPELINE] Starting scan ${runId}...`);

  // 1. Fetch posts from enabled Tier A sources
  const sourceBatches = await collectTierAPosts({
    sources: options?.sources,
    limitPerSource: options?.limitPerSource || 10,
  });

  // 2. Load operator profile for personalized pitch generation
  let operatorProfile;
  try {
    operatorProfile = await dataStore.getOperatorProfile();
  } catch {
    // fallback if profile not initialized
  }

  // 3. Existing requests lookup for deduplication
  let existingUrls = new Set<string>();
  try {
    const existing = await dataStore.getClientRequests({ limit: 1000 });
    for (const r of existing) {
      if (r.postUrl) existingUrls.add(r.postUrl.toLowerCase());
      if (r.sourceUrl) existingUrls.add(r.sourceUrl.toLowerCase());
    }
  } catch (err) {
    console.warn('[CLIENT_REQUESTS_PIPELINE] Error fetching existing requests:', err);
  }

  let totalFetched = 0;
  let relevantFound = 0;
  let newLeadsCreated = 0;
  const perSourceStats: Record<string, { fetched: number; relevant: number; error?: string }> = {};
  const newlyCreatedLeads: ClientRequestEntity[] = [];

  for (const [sourceName, batch] of Object.entries(sourceBatches)) {
    const posts = batch.posts || [];
    totalFetched += posts.length;
    let srcRelevant = 0;

    for (const post of posts) {
      // Deduplicate by URL
      if (existingUrls.has(post.postUrl.toLowerCase())) {
        continue;
      }

      // Classify post
      const extracted = await classifyPostText({
        postText: post.content,
        postUrl: post.postUrl,
        sourcePlatform: post.sourcePlatform,
        authorName: post.authorName,
        authorUsername: post.authorUsername,
      });

      if (extracted.isRelevant && extracted.matchScore >= minScore) {
        srcRelevant++;
        relevantFound++;

        const requestId = crypto.randomUUID();

        // Generate tailored pitches
        const generatedPitches = generatePitches({
          requestId,
          sourcePlatform: post.sourcePlatform,
          needSummary: extracted.needSummary,
          exactQuote: extracted.exactQuote,
          serviceFit: extracted.serviceFit,
          companyName: extracted.companyName || post.companyName,
          personName: extracted.personName || post.authorName,
          platformUsername: extracted.platformUsername || post.authorUsername,
          budget: extracted.budget,
          operatorProfile,
        });

        const pitches: RequestPitchEntity[] = [
          generatedPitches.email.variantA,
          generatedPitches.email.variantB,
          generatedPitches.platformMessage.variantA,
          generatedPitches.platformMessage.variantB,
          generatedPitches.followUp.variantA,
          generatedPitches.followUp.variantB,
        ];

        const channels: RequestChannelEntity[] = extracted.contactChannels.map((c, idx) => ({
          id: `ch-${requestId}-${idx}`,
          requestId,
          type: c.type,
          label: c.label,
          value: c.value,
          verified: c.verified,
          publicSourceUrl: post.postUrl,
        }));

        const newRequest: ClientRequestEntity = {
          id: requestId,
          sourcePlatform: post.sourcePlatform,
          sourceUrl: post.sourceUrl,
          sourcePostId: post.sourcePostId,
          postUrl: post.postUrl,
          quote: extracted.exactQuote,
          needSummary: extracted.needSummary,
          matchScore: extracted.matchScore,
          serviceFit: extracted.serviceFit,
          status: 'new',
          foundAt: post.publishedAt || new Date().toISOString(),
          personName: extracted.personName || post.authorName || null,
          companyName: extracted.companyName || post.companyName || null,
          platformUsername: extracted.platformUsername || post.authorUsername || null,
          platformProfileUrl: post.authorUsername && post.sourcePlatform === 'Hacker News'
            ? `https://news.ycombinator.com/user?id=${post.authorUsername}`
            : null,
          companyWebsite: null,
          companyProfileUrl: null,
          budget: extracted.budget,
          urgencySignals: extracted.urgencySignals,
          captureMethod: 'auto_feed',
          evidence: [
            {
              claim: `Public posting on ${post.sourcePlatform}`,
              sourceUrl: post.postUrl,
              date: post.publishedAt,
            },
          ],
          channels,
          pitches,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Persist to store
        try {
          await dataStore.saveClientRequest(newRequest);
          existingUrls.add(post.postUrl.toLowerCase());
          newlyCreatedLeads.push(newRequest);
          newLeadsCreated++;
        } catch (err) {
          console.warn(`[CLIENT_REQUESTS_PIPELINE] Failed to save request ${requestId}:`, err);
        }
      }
    }

    perSourceStats[sourceName] = {
      fetched: posts.length,
      relevant: srcRelevant,
      error: batch.error,
    };
  }

  // Sort top leads by matchScore descending
  const topLeads = newlyCreatedLeads.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
  const finishedAt = new Date().toISOString();

  console.log(`[CLIENT_REQUESTS_PIPELINE] Completed scan ${runId}: ${totalFetched} fetched, ${relevantFound} relevant, ${newLeadsCreated} saved.`);

  return {
    runId,
    startedAt,
    finishedAt,
    totalFetched,
    relevantFound,
    newLeadsCreated,
    perSourceStats,
    topLeads,
  };
}
