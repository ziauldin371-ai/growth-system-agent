import { ClientRequestEntity, RequestChannelEntity } from '@/types';
import crypto from 'crypto';
/**
 * Manual Intake Engine
 * Supports:
 * 1. "Paste a post"
 * 2. "Screenshot to lead" (Gemini Vision)
 * 3. Quick capture bookmarklet generator
 * 4. CSV Import with dedupe & suppression check
 */

import { classifyPostText, ExtractedRequestData } from './classifier';

export interface ManualPostInput {
  postText: string;
  postUrl: string;
  sourcePlatform: string;
  personName?: string;
  companyName?: string;
  platformUsername?: string;
  platformProfileUrl?: string;
  companyWebsite?: string;
}

export interface ScreenshotExtractionResult {
  personName: string | null;
  companyName: string | null;
  platform: string;
  platformUsername: string | null;
  needText: string;
  budget: string | null;
  timeline: string | null;
  contactInfo: string | null;
  fieldsFromImage: Record<string, boolean>;
}

/**
 * 1. Process "Paste a post"
 */
export async function processPastedPost(input: ManualPostInput): Promise<ExtractedRequestData> {
  const extracted = await classifyPostText({
    postText: input.postText,
    postUrl: input.postUrl,
    sourcePlatform: input.sourcePlatform,
    authorName: input.personName,
    authorUsername: input.platformUsername,
  });

  // Override with human-provided fields if provided
  if (input.personName && input.personName.trim()) {
    extracted.personName = input.personName.trim();
  }
  if (input.companyName && input.companyName.trim()) {
    extracted.companyName = input.companyName.trim();
  }
  if (input.platformUsername && input.platformUsername.trim()) {
    extracted.platformUsername = input.platformUsername.trim().replace(/^@/, '');
  }

  return extracted;
}

/**
 * 2. Process "Screenshot to lead" using Gemini Vision
 */
export async function extractFromScreenshot(params: {
  imageBase64: string;
  mimeType: string;
  apiKey?: string;
}): Promise<ScreenshotExtractionResult> {
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Return empty structured form when no key is configured
    return {
      personName: null,
      companyName: null,
      platform: 'Other',
      platformUsername: null,
      needText: '',
      budget: null,
      timeline: null,
      contactInfo: null,
      fieldsFromImage: {},
    };
  }

  const prompt = `Examine this screenshot of a professional post or freelance brief.
Extract ONLY visible factual text. Do NOT guess unreadable text.

Return JSON with exact keys:
{
  "personName": string or null,
  "companyName": string or null,
  "platform": string (e.g. "Upwork", "Contra", "LinkedIn", "Wellfound", "Reddit", "Twitter", "Other"),
  "platformUsername": string or null (handle/ID, without @),
  "needText": string (exact requirement text visible),
  "budget": string or null (only if visible),
  "timeline": string or null (only if visible),
  "contactInfo": string or null (email or website if visible)
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: params.mimeType,
                  data: params.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) throw new Error(`Gemini Vision HTTP ${res.status}`);
    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Empty Gemini Vision response');

    const parsed = JSON.parse(raw);

    const fieldsFromImage: Record<string, boolean> = {};
    if (parsed.personName) fieldsFromImage.personName = true;
    if (parsed.companyName) fieldsFromImage.companyName = true;
    if (parsed.platformUsername) fieldsFromImage.platformUsername = true;
    if (parsed.budget) fieldsFromImage.budget = true;
    if (parsed.timeline) fieldsFromImage.timeline = true;
    if (parsed.needText) fieldsFromImage.needText = true;

    return {
      personName: parsed.personName || null,
      companyName: parsed.companyName || null,
      platform: parsed.platform || 'Other',
      platformUsername: parsed.platformUsername || null,
      needText: parsed.needText || '',
      budget: parsed.budget || null,
      timeline: parsed.timeline || null,
      contactInfo: parsed.contactInfo || null,
      fieldsFromImage,
    };
  } catch (err) {
    console.warn('[SCREENSHOT_EXTRACTOR] Error:', err);
    return {
      personName: null,
      companyName: null,
      platform: 'Other',
      platformUsername: null,
      needText: '',
      budget: null,
      timeline: null,
      contactInfo: null,
      fieldsFromImage: {},
    };
  }
}

/**
 * 3. Generate Draggable Bookmarklet Code
 */
export function generateBookmarkletCode(appBaseUrl: string): string {
  const cleanUrl = appBaseUrl.replace(/\/$/, '');
  const script = `javascript:(function(){
    var sel = window.getSelection().toString().trim();
    var title = document.title || '';
    var url = window.location.href;
    var params = '?url=' + encodeURIComponent(url.slice(0, 1000)) +
                 '&title=' + encodeURIComponent(title.slice(0, 200)) +
                 '&text=' + encodeURIComponent(sel.slice(0, 3000));
    window.open('${cleanUrl}/capture' + params, 'GrowthCapture', 'width=620,height=750,scrollbars=yes,resizable=yes');
  })();`;
  return script.replace(/\s+/g, ' ').trim();
}

/**
 * 4. Parse CSV Import
 */
export interface CsvLeadRow {
  name?: string;
  company?: string;
  website?: string;
  email?: string;
  source?: string;
  url?: string;
  notes?: string;
  platform?: string;
  username?: string;
  profileUrl?: string;
}

export function parseLeadsCsv(csvContent: string): CsvLeadRow[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  const rows: CsvLeadRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parser supporting quotes
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const cleanValues = values.map(v => v.trim().replace(/^["']|["']$/g, ''));

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cleanValues[idx] || '';
    });

    rows.push({
      name: row.name || row.person || row.person_name,
      company: row.company || row.company_name,
      website: row.website || row.domain,
      email: row.email,
      source: row.source || 'csv_import',
      url: row.url || row.post_url,
      notes: row.notes,
      platform: row.platform || row.source_platform,
      username: row.username || row.platform_username,
      profileUrl: row.profileurl || row.profile_url || row.platform_profile_url,
    });
  }

  return rows;
}


export async function extractLeadFromPost(
  rawText: string,
  sourceUrl: string,
  sourcePlatform: string
): Promise<ClientRequestEntity> {
  const extracted = await processPastedPost({
    postText: rawText,
    postUrl: sourceUrl,
    sourcePlatform,
  });

  const requestId = 'req_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
  const channels: RequestChannelEntity[] = extracted.contactChannels.map((c, i) => ({
    id: 'chan_' + requestId + '_' + i,
    requestId,
    type: c.type,
    label: c.label,
    value: c.value,
    verified: c.verified,
    publicSourceUrl: sourceUrl || undefined,
    createdAt: new Date().toISOString(),
  }));

  return {
    id: requestId,
    sourcePlatform: sourcePlatform || 'Manual Paste',
    sourceUrl: sourceUrl || '',
    postUrl: sourceUrl || '',
    quote: extracted.exactQuote,
    needSummary: extracted.needSummary,
    matchScore: extracted.matchScore,
    serviceFit: extracted.serviceFit,
    status: 'new',
    foundAt: new Date().toISOString(),
    personName: extracted.personName,
    companyName: extracted.companyName,
    platformUsername: extracted.platformUsername,
    platformProfileUrl: extracted.platformUsername ? undefined : undefined,
    companyWebsite: undefined,
    companyProfileUrl: undefined,
    budget: extracted.budget,
    urgencySignals: extracted.urgencySignals,
    captureMethod: 'paste',
    evidence: [{
      claim: extracted.exactQuote,
      sourceUrl: sourceUrl || '',
      date: new Date().toISOString(),
    }],
    channels,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function extractLeadFromScreenshot(
  imageBase64: string,
  mimeType: string,
  sourceUrl: string,
  sourcePlatform: string
): Promise<ClientRequestEntity> {
  const extracted = await extractFromScreenshot({
    imageBase64,
    mimeType,
  });

  const rawPostText = extracted.needText || 'Screenshot request';
  return extractLeadFromPost(rawPostText, sourceUrl, extracted.platform || sourcePlatform);
}

export async function parseCsvIntake(csvContent: string): Promise<ClientRequestEntity[]> {
  const rows = parseLeadsCsv(csvContent);
  const leads: ClientRequestEntity[] = [];

  for (const r of rows) {
    const text = r.notes || r.name || r.company || '';
    if (!text.trim()) continue;

    const lead = await extractLeadFromPost(
      text,
      r.url || '',
      r.platform || r.source || 'CSV Import'
    );
    if (r.name) lead.personName = r.name;
    if (r.company) lead.companyName = r.company;
    if (r.username) lead.platformUsername = r.username;
    if (r.email) {
      lead.channels = lead.channels || [];
      lead.channels.push({
        id: 'chan_' + lead.id + '_email',
        requestId: lead.id,
        type: 'email',
        label: 'Direct Email',
        value: r.email,
        verified: false,
        createdAt: new Date().toISOString(),
      });
    }
    leads.push(lead);
  }

  return leads;
}
