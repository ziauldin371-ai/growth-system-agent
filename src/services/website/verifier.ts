import dns from 'dns/promises';
import { safeHttpGet, isPrivateOrReservedIp } from './ssrf-guard';
import { WebsiteVerificationResult } from '@/lib/validation/schemas';
import { WebsiteStatus } from '@/types';

const PARKED_PATTERNS = [
  /domain\s+is\s+for\s+sale/i,
  /buy\s+this\s+domain/i,
  /domain\s+registered\s+at/i,
  /parked\s+free\s+courtesy\s+of/i,
  /this\s+domain\s+may\s+be\s+for\s+sale/i,
  /godaddy\.com\/park/i,
  /sedoparking\.com/i,
  /namecheap\.com\/domains\/freeparking/i,
  /dan\.com/i,
  /hugedomains\.com/i,
  /website\s+coming\s+soon/i,
  /under\s+construction/i,
];

const SOCIAL_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'linktr.ee',
  'yelp.com',
];

export interface VerifyWebsiteOptions {
  domain?: string | null;
  socialUrls?: string[];
  businessName?: string;
  timeoutMs?: number;
}

/**
 * Extracts the HTML title and meta description from page source.
 */
function extractHtmlMetadata(html: string): { title?: string; description?: string } {
  let title: string | undefined;
  let description: string | undefined;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim().replace(/\s+/g, ' ');
  }

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  return { title, description };
}

/**
 * Extracts external social media and messaging links from HTML.
 */
export function extractSocialUrlsFromHtml(html: string): string[] {
  if (!html || typeof html !== 'string') return [];
  const platforms = [
    'linkedin.com',
    'instagram.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'wa.me',
    'whatsapp.com',
    'youtube.com',
    'tiktok.com',
  ];
  const found = new Set<string>();
  const hrefRegex = /href=["'](https?:\/\/[^"'\s>]+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const lower = rawUrl.toLowerCase();
    for (const p of platforms) {
      if (lower.includes(p)) {
        if (
          !lower.includes('sharer') &&
          !lower.includes('/share') &&
          !lower.includes('/intent/tweet') &&
          !lower.includes('plugins/') &&
          !lower.includes('widgets.js')
        ) {
          found.add(rawUrl);
        }
      }
    }
  }
  return Array.from(found);
}

/**
 * Normalizes a raw domain or website input into a clean hostname.
 */
export function normalizeDomain(raw?: string | null): string | null {
  if (!raw) return null;
  let cleaned = raw.trim().toLowerCase();
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, '');
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split('?')[0];
  cleaned = cleaned.split('#')[0];
  return cleaned || null;
}

/**
 * Core Website Verification Service
 * Checks domain DNS, SSL/TLS, HTTP headers, content heuristics, and SSRF restrictions.
 */
export async function verifyWebsite(options: VerifyWebsiteOptions): Promise<WebsiteVerificationResult> {
  const { domain: rawDomain, socialUrls = [], timeoutMs = 7000 } = options;
  const domain = normalizeDomain(rawDomain);

  // Case 1: No domain provided
  if (!domain) {
    if (socialUrls && socialUrls.length > 0) {
      return {
        domain: null,
        status: 'social_only',
        isPrivateIp: false,
        socialUrls,
        pageTitle: null,
        metaDescription: null,
        errorDetails: 'Business operates exclusively via social media profiles (no standalone web domain).',
      };
    }

    return {
      domain: null,
      status: 'apparently_absent',
      isPrivateIp: false,
      socialUrls: [],
      errorDetails: 'No website URL or custom domain recorded in commercial registers or discovery sources.',
    };
  }

  // Check if domain directly points to a social network
  for (const socialDomain of SOCIAL_DOMAINS) {
    if (domain.includes(socialDomain)) {
      return {
        domain,
        status: 'social_only',
        isPrivateIp: false,
        socialUrls: [domain],
        errorDetails: `Domain directs to third-party social/directory platform (${socialDomain}).`,
      };
    }
  }

  // Step 2: DNS Resolution check
  let dnsRecords: Record<string, any> = {};
  let resolvedIps: string[] = [];

  try {
    const aRecords = await dns.resolve4(domain).catch(() => []);
    const aaaaRecords = await dns.resolve6(domain).catch(() => []);
    const mxRecords = await dns.resolveMx(domain).catch(() => []);

    dnsRecords = { a: aRecords, aaaa: aaaaRecords, mx: mxRecords };
    resolvedIps = [...aRecords, ...aaaaRecords];

    if (resolvedIps.length === 0) {
      // No DNS records found
      return {
        domain,
        status: 'apparently_absent',
        dnsRecords,
        isPrivateIp: false,
        errorDetails: `Domain "${domain}" has no active DNS A or AAAA records.`,
      };
    }
  } catch (dnsErr: any) {
    if (dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'NODATA') {
      return {
        domain,
        status: 'apparently_absent',
        dnsRecords: null,
        isPrivateIp: false,
        errorDetails: `DNS lookup failed (NXDOMAIN / ENOTFOUND): domain "${domain}" appears unregistered or abandoned.`,
      };
    }
  }

  // Step 3: Check for Private IP resolution (SSRF)
  for (const ip of resolvedIps) {
    if (isPrivateOrReservedIp(ip)) {
      return {
        domain,
        status: 'broken',
        ipAddress: ip,
        isPrivateIp: true,
        dnsRecords,
        errorDetails: `Domain points to prohibited private/reserved IP: ${ip}`,
      };
    }
  }

  // Step 4: Safe HTTP/HTTPS Probe
  try {
    // Try HTTPS first
    let probe = await safeHttpGet(`https://${domain}`, timeoutMs).catch(async (httpsErr) => {
      // Fallback to HTTP if HTTPS fails connection
      return await safeHttpGet(`http://${domain}`, timeoutMs);
    });

    const metadata = extractHtmlMetadata(probe.body);
    const htmlSocials = extractSocialUrlsFromHtml(probe.body);
    const combinedSocialUrls = Array.from(new Set([...(socialUrls || []), ...htmlSocials]));

    // Check if redirected to a social network
    const finalUrlLower = probe.finalUrl.toLowerCase();
    for (const socialDomain of SOCIAL_DOMAINS) {
      if (finalUrlLower.includes(socialDomain)) {
        return {
          domain,
          status: 'social_only',
          httpStatusCode: probe.statusCode,
          ipAddress: probe.ipAddress,
          isPrivateIp: false,
          redirectChain: probe.redirectChain,
          socialUrls: Array.from(new Set([...combinedSocialUrls, probe.finalUrl])),
          pageTitle: metadata.title,
          verificationLatencyMs: probe.latencyMs,
          errorDetails: `Domain redirected to social media URL: ${probe.finalUrl}`,
        };
      }
    }

    // Check for parked domain indicators
    const isParked = PARKED_PATTERNS.some(
      pattern => pattern.test(probe.body) || (metadata.title && pattern.test(metadata.title))
    );

    if (isParked) {
      return {
        domain,
        status: 'parked',
        httpStatusCode: probe.statusCode,
        tlsValid: probe.tlsValid,
        ipAddress: probe.ipAddress,
        isPrivateIp: false,
        redirectChain: probe.redirectChain,
        socialUrls: combinedSocialUrls,
        pageTitle: metadata.title,
        metaDescription: metadata.description,
        verificationLatencyMs: probe.latencyMs,
        errorDetails: 'Domain displays a parked registrar landing page or sale notice.',
      };
    }

    // Status code checks
    if (probe.statusCode >= 200 && probe.statusCode < 400) {
      // Substantive content check: page must have non-trivial HTML
      const cleanedBody = probe.body.replace(/<[^>]*>/g, '').trim();
      if (cleanedBody.length < 50 && !metadata.title) {
        return {
          domain,
          status: 'broken',
          httpStatusCode: probe.statusCode,
          tlsValid: probe.tlsValid,
          ipAddress: probe.ipAddress,
          isPrivateIp: false,
          socialUrls: combinedSocialUrls,
          pageTitle: metadata.title,
          verificationLatencyMs: probe.latencyMs,
          errorDetails: 'HTTP 200 returned but page is completely blank / lacks HTML content.',
        };
      }

      return {
        domain,
        status: 'functional',
        httpStatusCode: probe.statusCode,
        tlsValid: probe.tlsValid,
        ipAddress: probe.ipAddress,
        isPrivateIp: false,
        redirectChain: probe.redirectChain,
        socialUrls: combinedSocialUrls,
        pageTitle: metadata.title,
        metaDescription: metadata.description,
        verificationLatencyMs: probe.latencyMs,
      };
    }

    if (probe.statusCode >= 500) {
      return {
        domain,
        status: 'broken',
        httpStatusCode: probe.statusCode,
        ipAddress: probe.ipAddress,
        isPrivateIp: false,
        redirectChain: probe.redirectChain,
        socialUrls: combinedSocialUrls,
        verificationLatencyMs: probe.latencyMs,
        errorDetails: `Server returned HTTP server error ${probe.statusCode}.`,
      };
    }

    return {
      domain,
      status: 'broken',
      httpStatusCode: probe.statusCode,
      tlsValid: probe.tlsValid,
      ipAddress: probe.ipAddress,
      isPrivateIp: false,
      redirectChain: probe.redirectChain,
      socialUrls: combinedSocialUrls,
      pageTitle: metadata.title,
      metaDescription: metadata.description,
      verificationLatencyMs: probe.latencyMs,
      errorDetails: `HTTP request completed with unexpected status code ${probe.statusCode}.`,
    };

  } catch (probeErr: any) {
    const errMessage = probeErr?.message || String(probeErr);

    // Crucial rule: Do NOT classify as "apparently_absent" just due to a temporary timeout or TLS handshake glitch
    if (errMessage.includes('timeout') || errMessage.includes('ETIMEDOUT') || errMessage.includes('ECONNRESET')) {
      return {
        domain,
        status: 'inconclusive',
        isPrivateIp: false,
        errorDetails: `Request timed out or connection was reset (${errMessage}). Marked inconclusive to avoid false negative.`,
      };
    }

    if (errMessage.includes('SSRF Guard') || errMessage.includes('private/reserved IP')) {
      return {
        domain,
        status: 'broken',
        isPrivateIp: true,
        errorDetails: errMessage,
      };
    }

    return {
      domain,
      status: 'broken',
      isPrivateIp: false,
      errorDetails: `Website probe connection failed: ${errMessage}`,
    };
  }
}
