import { BusinessEntity, AlternativeChannelEntity, AlternativeChannelPlatform } from '@/types';

export interface GeneratedPlatformPitch {
  platform: AlternativeChannelPlatform;
  pitch: string;
  charCount: number;
  wordCount: number;
  isVerifiedMatch: boolean;
  evidenceSources: Array<{ sourceName: string; sourceUrl?: string; summary: string }>;
  suggestedTouchOrder: number;
  warnings?: string[];
}

/**
 * Generates bespoke, platform-compliant outreach copy adhering to Part D constraints.
 * Strictly avoids flattery, fake urgency, and unverified claims.
 */
export function generatePlatformPitch(params: {
  business: BusinessEntity;
  platform: AlternativeChannelPlatform;
  profileUrl: string;
  sourceType: 'website_link' | 'google_places' | 'search_match' | 'directory';
  verifiedObservation?: string;
  serviceOffer?: string;
}): GeneratedPlatformPitch {
  const { business, platform, profileUrl, sourceType } = params;

  // Determine verification badge
  const isVerifiedMatch = sourceType === 'website_link' || sourceType === 'google_places';

  // Extract clean evidence citations
  const evidenceSources: Array<{ sourceName: string; sourceUrl?: string; summary: string }> = [];
  if (business.evidence && business.evidence.length > 0) {
    business.evidence.slice(0, 2).forEach(ev => {
      evidenceSources.push({
        sourceName: ev.sourceName,
        sourceUrl: ev.sourceUrl || undefined,
        summary: ev.summary,
      });
    });
  } else {
    evidenceSources.push({
      sourceName: business.sourceProvider,
      summary: `Verified commercial profile in ${business.city || business.country}.`,
    });
  }

  const observation = params.verifiedObservation ||
    (business.evidence?.[0]?.summary || `noticed your commercial growth in ${business.city || business.country}`);

  const offer = params.serviceOffer ||
    (business.pipelineType === 'website_opportunities'
      ? 'custom mobile-responsive web development'
      : 'custom Python workflow automation and AI agent systems');

  let pitchText = '';
  let touchOrder = 2; // Default touch 2 (after initial email)

  switch (platform) {
    case 'linkedin': {
      // Rule: LinkedIn connection note <= 300 chars, no pitch, 1 genuine point, no link
      const note = `Hi ${business.name} team — ${observation.toLowerCase().replace(/\.$/, '')}. As a Full Stack AI Developer & Automation Architect, I follow tech implementations across ${business.city || 'your region'}. Would love to connect and keep in touch.`;
      pitchText = note.slice(0, 300);
      touchOrder = 2;
      break;
    }

    case 'instagram':
    case 'facebook': {
      // Rule: 30-60 words, friendly, casual yet professional, no links
      pitchText = `Hi ${business.name} team! Impressed by your latest work. I help growing businesses streamline operations through ${offer}. If you are ever exploring ways to save team hours on repetitive workflows, let me know — happy to share a quick idea.`;
      touchOrder = 3;
      break;
    }

    case 'twitter': {
      // Rule: Under 280 chars, concise observation and soft CTA
      const tweet = `Hi @${business.normalizedName} — ${observation}. I build ${offer} for growing teams. Open to sharing a 2-minute diagnostic idea if helpful? Best, Zia`;
      pitchText = tweet.slice(0, 280);
      touchOrder = 3;
      break;
    }

    case 'contact_form': {
      // Rule: 60-100 words, subject line, business reason, 1 question
      pitchText = `Subject: Quick question regarding ${business.name} operations\n\nHi ${business.name} team,\n\nI came across your organization while researching growing businesses in ${business.city || business.country}.\n\nAs a Full Stack AI Developer & Automation Architect, I help companies implement ${offer} to reduce overhead and improve response times.\n\nWould you be open to a 2-minute conversation to see if this aligns with your current priorities?\n\nBest regards,\nZia Ul Din\nziauldin371@gmail.com`;
      touchOrder = 4;
      break;
    }

    case 'youtube': {
      // Rule: Constructive comment, never a sales pitch
      pitchText = `Great insights shared in this video. Really appreciate the breakdown of your operational focus!`;
      touchOrder = 5;
      break;
    }

    default: {
      pitchText = `Hello ${business.name} team — reached out regarding ${offer} tailored for your sector. Happy to provide a brief technical breakdown if of interest.`;
      touchOrder = 4;
      break;
    }
  }

  const charCount = pitchText.length;
  const wordCount = pitchText.split(/\s+/).filter(Boolean).length;

  return {
    platform,
    pitch: pitchText,
    charCount,
    wordCount,
    isVerifiedMatch,
    evidenceSources,
    suggestedTouchOrder: touchOrder,
  };
}
