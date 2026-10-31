import { MarketplaceHotRequestEntity } from '@/types';
import { perPlatformPitchEngine } from '@/services/ai/per-platform-pitch-engine';
import { dataStore } from '@/services/repository/data-store';
import crypto from 'crypto';

export class HotRequestEngine {
  private readonly AI_KEYWORDS = [
    'ai', 'ml', 'llm', 'rag', 'machine learning', 'python', 'fastapi',
    'langchain', 'llamaindex', 'nlp', 'computer vision', 'deep learning',
    'forecasting', 'anomaly detection', 'chatbot', 'data engineering',
    'vector', 'pinecone', 'qdrant', 'fine-tuning', 'openai', 'gemini'
  ];

  private readonly SCAM_INDICATORS = [
    'telegram only',
    'whatsapp only to apply',
    'pay registration fee',
    'deposit crypto',
    'free test project 20 hours',
    'bank account details before interview',
    'send western union',
    'check deposit scam',
  ];

  public parsePastedJob(
    rawText: string,
    platform: string = 'Upwork',
    postUrl: string = 'https://www.upwork.com/'
  ): MarketplaceHotRequestEntity {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const title = lines[0] || 'Client Project Request';
    const description = lines.slice(1).join('\n') || rawText;

    const lower = rawText.toLowerCase();

    // 1. Classify Post Type
    let postType: MarketplaceHotRequestEntity['postType'] = 'explicit_hire';
    if (lower.includes('tender') || lower.includes('rfp') || lower.includes('procurement')) {
      postType = 'tender';
    } else if (lower.includes('recommend') || lower.includes('anyone know a good')) {
      postType = 'recommendation_request';
    } else if (lower.includes('partner') || lower.includes('agency subcontract') || lower.includes('white label')) {
      postType = 'partnership_request';
    } else if (lower.includes('full-time') || lower.includes('salary') || lower.includes('benefits')) {
      postType = 'job_posting';
    }

    // 2. Score Fit
    let fitScore = 40; // baseline
    for (const kw of this.AI_KEYWORDS) {
      if (lower.includes(kw)) fitScore += 7;
    }
    fitScore = Math.min(98, Math.max(20, fitScore));

    // 3. Scam Detection
    let isScam = false;
    for (const scam of this.SCAM_INDICATORS) {
      if (lower.includes(scam)) {
        isScam = true;
        fitScore = Math.min(10, fitScore);
        break;
      }
    }

    // 4. Extract Budget Range
    const budgetMatch = rawText.match(/(\$\d+(?:,\d+)?(?:\s*-\s*\$?\d+(?:,\d+)?)?|\d+\s*(?:USD|EUR|GBP))/i);
    const budgetRange = budgetMatch ? budgetMatch[0] : 'Budget negotiable / Open quote';

    // 5. Generate tailored proposal draft
    const pitch = perPlatformPitchEngine.generatePitch({
      platform,
      pitchMode: 'proposal',
      companyName: 'Client Project Lead',
      observedSignal: title,
    });

    const now = new Date();
    const respondBefore = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const request: MarketplaceHotRequestEntity = {
      id: `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      platform,
      title: title.slice(0, 120),
      description: description.slice(0, 1500),
      postUrl,
      postType,
      fitScore,
      freshnessHours: 1.5,
      isScam,
      budgetRange,
      proposalDraft: pitch.pitchContent,
      screeningAnswers: {
        'Relevant experience': 'Over 4 years building production Python, RAG pipelines, and automated cloud workflows.',
        'Estimated timeline': 'Proof of concept delivered within 2-3 weeks; production deployment following review.',
      },
      postedAt: now.toISOString(),
      respondBefore,
      status: 'new',
      createdAt: now.toISOString(),
    };

    dataStore.saveHotRequest(request);
    return request;
  }
}

export const hotRequestEngine = new HotRequestEngine();

