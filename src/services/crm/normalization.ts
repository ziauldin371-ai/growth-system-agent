/**
 * Business & Contact Normalization and Deduplication Utilities
 */

const LEGAL_SUFFIXES = [
  /\bpty\s+ltd\b/gi,
  /\bpty\b/gi,
  /\bllc\b/gi,
  /\binc\.?\b/gi,
  /\bcorp(oration)?\.?\b/gi,
  /\bltd\.?\b/gi,
  /\blimited\b/gi,
  /\bplc\b/gi,
  /\bgmbh\b/gi,
  /\bco\.?\b/gi,
  /\bcompany\b/gi,
  /\bgroup\b/gi,
  /\bservices\b/gi,
];

/**
 * Normalizes a company name for fuzzy duplicate detection.
 * Removes legal entity suffixes, punctuation, multiple spaces, and normalizes case.
 */
export function normalizeBusinessName(name: string): string {
  if (!name) return '';
  let cleaned = name.trim().toLowerCase();

  // Replace punctuation, parentheses, and symbols with spaces
  cleaned = cleaned.replace(/['"’`]/g, '');
  cleaned = cleaned.replace(/[&]/g, ' and ');
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove legal suffixes
  for (const suffix of LEGAL_SUFFIXES) {
    cleaned = cleaned.replace(suffix, ' ');
  }

  // Collapse multiple whitespaces again
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Normalizes an email address for deduplication.
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const cleaned = email.trim().toLowerCase();
  const parts = cleaned.split('@');
  if (parts.length !== 2) return null;

  const [local, domain] = parts;
  // Handle gmail dots normalization
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const baseLocal = local.split('+')[0].replace(/\./g, '');
    return `${baseLocal}@gmail.com`;
  }

  // Generic plus-address stripping
  const baseLocal = local.split('+')[0];
  return `${baseLocal}@${domain}`;
}

/**
 * Calculates Levenshtein distance between two normalized strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Returns string similarity ratio between 0.00 and 1.00 based on Levenshtein distance.
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Determines whether two business entities represent the same company.
 */
export function isDuplicateBusiness(
  a: { 
    normalizedName: string; 
    normalizedDomain?: string | null; 
    phone?: string | null; 
    city?: string | null;
    address?: string | null;
    email?: string | null;
  },
  b: { 
    normalizedName: string; 
    normalizedDomain?: string | null; 
    phone?: string | null; 
    city?: string | null;
    address?: string | null;
    email?: string | null;
  }
): boolean {
  // 1. Email match is definitive
  if (a.email && b.email) {
    const normEmailA = normalizeEmail(a.email);
    const normEmailB = normalizeEmail(b.email);
    if (normEmailA && normEmailB && normEmailA === normEmailB) return true;
  }

  // 2. Domain match is definitive
  if (a.normalizedDomain && b.normalizedDomain) {
    if (a.normalizedDomain.toLowerCase() === b.normalizedDomain.toLowerCase()) return true;
  }

  // 3. Phone match is definitive
  if (a.phone && b.phone) {
    const cleanPhoneA = a.phone.replace(/\D/g, '');
    const cleanPhoneB = b.phone.replace(/\D/g, '');
    if (cleanPhoneA.length >= 7 && cleanPhoneA === cleanPhoneB) return true;
  }

  // 4. Exact normalized name match within same city or phone or address
  if (a.normalizedName === b.normalizedName) {
    if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) return true;
    if (a.address && b.address && a.address.toLowerCase().slice(0, 15) === b.address.toLowerCase().slice(0, 15)) return true;
  }

  // 5. Fuzzy name similarity > 0.85 within same city
  if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) {
    const sim = stringSimilarity(a.normalizedName, b.normalizedName);
    if (sim >= 0.85) return true;
  }

  return false;
}

/**
 * Sanitizes a string for CSV export to prevent CSV Formula Injection attacks.
 * Follows OWASP recommendations: prefix fields starting with =, +, -, @, \t, \r with a single quote.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);

  // Check if string begins with dangerous formula trigger characters
  const trimmed = str.trimStart();
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  let safeStr = str;

  if (dangerousChars.some(char => trimmed.startsWith(char))) {
    // Prepend single quote to neutralize formula execution in Excel/Sheets
    safeStr = `'${str}`;
  }

  // Escape inner double quotes
  const escaped = safeStr.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates an injection-safe CSV document from an array of records.
 */
export function generateSafeCsv(headers: string[], rows: Array<Record<string, any>>): string {
  const headerLine = headers.map(h => sanitizeCsvCell(h)).join(',');
  const rowLines = rows.map(row => 
    headers.map(h => sanitizeCsvCell(row[h])).join(',')
  );
  return [headerLine, ...rowLines].join('\r\n');
}
