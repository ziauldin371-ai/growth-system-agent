import { BusinessEntity, PlatformFootprintCandidate } from '@/types';
import { dataStore } from '@/services/repository/data-store';
import crypto from 'crypto';

export interface TouchSpacingCheck {
  allowed: boolean;
  reason?: string;
  lastContactedAt?: string | null;
  daysSinceLastTouch?: number;
}

export class PlatformFootprintFinder {
  private readonly PLATFORM_PATTERNS = [
    { platform: 'LinkedIn', regex: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/gi, category: 'social' },
    { platform: 'X (Twitter)', regex: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/gi, category: 'social' },
    { platform: 'Facebook', regex: /https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]+)/gi, category: 'social' },
    { platform: 'Instagram', regex: /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/gi, category: 'social' },
    { platform: 'YouTube', regex: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9_-]+)/gi, category: 'social' },
    { platform: 'TikTok', regex: /https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._-]+)/gi, category: 'social' },
    { platform: 'Clutch', regex: /https?:\/\/(?:www\.)?clutch\.co\/profile\/([a-zA-Z0-9_-]+)/gi, category: 'b2b_directory' },
    { platform: 'GoodFirms', regex: /https?:\/\/(?:www\.)?goodfirms\.co\/company\/([a-zA-Z0-9_-]+)/gi, category: 'b2b_directory' },
    { platform: 'G2', regex: /https?:\/\/(?:www\.)?g2\.com\/products\/([a-zA-Z0-9_-]+)/gi, category: 'company_intel' },
    { platform: 'Crunchbase', regex: /https?:\/\/(?:www\.)?crunchbase\.com\/organization\/([a-zA-Z0-9_-]+)/gi, category: 'company_intel' },
    { platform: 'GitHub', regex: /https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/gi, category: 'company_intel' },
    { platform: 'Product Hunt', regex: /https?:\/\/(?:www\.)?producthunt\.com\/products\/([a-zA-Z0-9_-]+)/gi, category: 'startup_community' },
    { platform: 'Wellfound', regex: /https?:\/\/(?:www\.)?wellfound\.com\/company\/([a-zA-Z0-9_-]+)/gi, category: 'startup_community' },
    { platform: 'Trustpilot', regex: /https?:\/\/(?:www\.)?trustpilot\.com\/review\/([a-zA-Z0-9._-]+)/gi, category: 'local_business_directory' },
    { platform: 'Yelp', regex: /https?:\/\/(?:www\.)?yelp\.com\/biz\/([a-zA-Z0-9_-]+)/gi, category: 'local_business_directory' },
    { platform: 'WhatsApp', regex: /https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\d+)/gi, category: 'social' },
    { platform: 'Booking (Cal/Calendly)', regex: /https?:\/\/(?:calendly\.com|cal\.com)\/([a-zA-Z0-9_-]+)/gi, category: 'contact_form' },
    { platform: 'Slack / Discord Community', regex: /https?:\/\/(?:join\.slack\.com|discord\.(?:gg|com\/invite))\/[a-zA-Z0-9_-]+/gi, category: 'startup_community' },
  ];

  /**
   * Scans a company's website HTML and metadata to discover verified footprints
   */
  public async discoverFootprints(
    business: BusinessEntity,
    htmlContent?: string
  ): Promise<PlatformFootprintCandidate[]> {
    const candidates: PlatformFootprintCandidate[] = [];
    const seenUrls = new Set<string>();

    const addCandidate = (platform: string, profileUrl: string, source: 'website' | 'schema_same_as' | 'google_places' | 'directory' | 'manual_paste', isVerified: boolean) => {
      const cleanUrl = profileUrl.trim().replace(/[)\]'",;]+$/, '');
      if (seenUrls.has(cleanUrl)) return;
      seenUrls.add(cleanUrl);

      const candidate: PlatformFootprintCandidate = {
        id: `fp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        businessId: business.id,
        platform,
        profileUrl: cleanUrl,
        source,
        verificationStatus: isVerified ? 'verified' : 'possible_match',
        confidence: isVerified ? 0.95 : 0.65,
        lastChecked: new Date().toISOString(),
        notes: isVerified ? 'Discovered directly on official website' : 'Possible directory or public profile match',
      };
      candidates.push(candidate);
      dataStore.saveFootprint(candidate);
    };

    // 1. Scan HTML content if available
    if (htmlContent) {
      for (const pat of this.PLATFORM_PATTERNS) {
        const matches = htmlContent.match(pat.regex);
        if (matches) {
          for (const m of matches) {
            addCandidate(pat.platform, m, 'website', true);
          }
        }
      }

      // Check schema.org sameAs
      const sameAsRegex = /"sameAs"\s*:\s*\[([^\]]+)\]/gi;
      const sameAsMatch = sameAsRegex.exec(htmlContent);
      if (sameAsMatch && sameAsMatch[1]) {
        const urls = sameAsMatch[1].match(/(https?:\/\/[^"\s]+)/gi) || [];
        for (const u of urls) {
          for (const pat of this.PLATFORM_PATTERNS) {
            if (pat.regex.test(u)) {
              addCandidate(pat.platform, u, 'schema_same_as', true);
            }
          }
        }
      }

      // Contact form link detection
      const contactFormRegex = /href=["']([^"']*(?:contact|contact-us|get-in-touch|book-a-call)[^"']*)["']/gi;
      let cfMatch;
      while ((cfMatch = contactFormRegex.exec(htmlContent)) !== null) {
        let fullUrl = cfMatch[1];
        if (fullUrl.startsWith('/')) {
          fullUrl = business.domain ? `https://${business.domain}${fullUrl}` : fullUrl;
        }
        if (fullUrl.startsWith('http')) {
          addCandidate('Contact Form', fullUrl, 'website', true);
          break; // First contact form is enough
        }
      }
    }

    // 2. Scan Google Places phone for WhatsApp
    const phone = business.phone;
    if (phone) {
      const digits = phone.replace(/[^0-9]/g, '');
      if (digits.length >= 8) {
        addCandidate('WhatsApp Business', `https://wa.me/${digits}`, 'google_places', true);
      }
    }

    // 3. Fallback: Search Links for Company Intelligence (Marked as Possible Match)
    if (candidates.length === 0 && business.name) {
      const encoded = encodeURIComponent(business.name);
      addCandidate('LinkedIn Company Search', `https://www.linkedin.com/search/results/companies/?keywords=${encoded}`, 'directory', false);
      addCandidate('Clutch Directory Search', `https://clutch.co/search?q=${encoded}`, 'directory', false);
      addCandidate('Crunchbase Search', `https://www.crunchbase.com/textsearch?q=${encoded}`, 'directory', false);
    }

    return candidates;
  }

  /**
   * Rule: No more than one touch per 3 days across all channels.
   * Stop all channels on reply, unsubscribe or "no".
   */
  public async verifyTouchSpacing(businessId: string): Promise<TouchSpacingCheck> {
    // 1. Global suppression check
    const business = (await dataStore.getBusinesses({ limit: 5000, includeDemo: true })).businesses.find(b => b.id === businessId);
    if (business?.domain && (await dataStore.isSuppressed(business.domain))) {
      return { allowed: false, reason: 'Business domain is on global suppression list (opted out or unsubscribed).' };
    }

    // 2. Check draft replies
    const allDrafts = await dataStore.getDrafts({ limit: 500, includeDemo: true });
    const drafts = allDrafts.filter(d => d.businessId === businessId);
    const hasNegativeReply = drafts.some(d => d.deliveryStatus === 'replied' || (d as any).hasNegativeReply);
    if (hasNegativeReply) {
      return { allowed: false, reason: 'Client has already replied or engaged. Automated multi-channel outreach is parked.' };
    }

    // 3. Check 3-day touch spacing across all channels
    const channels = await dataStore.getAlternativeChannels(businessId);
    const sentDrafts = drafts.filter(d => d.status === 'sent' && d.sentAt);

    let mostRecentContactTime: number = 0;
    for (const c of channels) {
      if (c.contactedAt) {
        const t = new Date(c.contactedAt).getTime();
        if (t > mostRecentContactTime) mostRecentContactTime = t;
      }
    }
    for (const d of sentDrafts) {
      if (d.sentAt) {
        const t = new Date(d.sentAt).getTime();
        if (t > mostRecentContactTime) mostRecentContactTime = t;
      }
    }

    if (mostRecentContactTime > 0) {
      const msSince = Date.now() - mostRecentContactTime;
      const daysSince = msSince / (1000 * 60 * 60 * 24);
      if (daysSince < 3.0) {
        return {
          allowed: false,
          reason: `Touch spacing rule active: Last contacted ${daysSince.toFixed(1)} days ago. Minimum 3 days (72 hours) required between outreach attempts across all channels.`,
          lastContactedAt: new Date(mostRecentContactTime).toISOString(),
          daysSinceLastTouch: Number(daysSince.toFixed(1)),
        };
      }
    }

    return { allowed: true, daysSinceLastTouch: mostRecentContactTime ? Number(((Date.now() - mostRecentContactTime) / (1000 * 60 * 60 * 24)).toFixed(1)) : undefined };
  }
}

export const platformFootprintFinder = new PlatformFootprintFinder();
