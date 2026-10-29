import { describe, it, expect } from 'vitest';
import { 
  normalizeBusinessName, 
  normalizeEmail, 
  stringSimilarity, 
  isDuplicateBusiness, 
  sanitizeCsvCell, 
  generateSafeCsv 
} from '../normalization';

describe('CRM Normalization & Deduplication', () => {
  it('normalizes business names by stripping legal entity suffixes and punctuation', () => {
    expect(normalizeBusinessName("Apex Plumbing & HVAC, LLC")).toBe('apex plumbing and hvac');
    expect(normalizeBusinessName("DocuSync Systems Inc.")).toBe('docusync systems');
    expect(normalizeBusinessName("Starlight Dental Group Ltd.")).toBe('starlight dental');
    expect(normalizeBusinessName("Vanguard Precision Co. (Pty Ltd)")).toBe('vanguard precision');
  });

  it('normalizes email addresses and handles aliases', () => {
    expect(normalizeEmail('John.Doe+promo@gmail.com')).toBe('johndoe@gmail.com');
    expect(normalizeEmail('Alex.Wright@DocuSyncLogistics.io')).toBe('alex.wright@docusynclogistics.io');
    expect(normalizeEmail('invalid-email')).toBeNull();
  });

  it('detects duplicate businesses by normalized domain or name and city', () => {
    const b1 = {
      normalizedName: 'vanguard precision hvac',
      normalizedDomain: 'vanguardhvac.com',
      city: 'Austin',
      phone: '+15125550142',
    };

    const b2 = {
      normalizedName: 'vanguard precision hvac',
      normalizedDomain: 'vanguardhvac.com',
      city: 'Austin',
      phone: '+15125550142',
    };

    const b3 = {
      normalizedName: 'apex artisan bakery',
      normalizedDomain: 'apexartisan.co.uk',
      city: 'London',
      phone: '+442079460912',
    };

    expect(isDuplicateBusiness(b1, b2)).toBe(true);
    expect(isDuplicateBusiness(b1, b3)).toBe(false);
  });

  it('calculates string similarity correctly', () => {
    expect(stringSimilarity('vanguard hvac', 'vanguard hvac')).toBe(1.0);
    expect(stringSimilarity('vanguard hvac', 'vanguard hvac services')).toBeGreaterThan(0.55);
    expect(stringSimilarity('alpha', 'omega')).toBeLessThan(0.3);
  });
});

describe('CSV Formula Injection Defense', () => {
  it('sanitizes strings starting with dangerous formula characters (=, +, -, @, \\t, \\r)', () => {
    // Dangerous Excel formula: =cmd|' /C calc'!A0
    const rawFormula = '=cmd|\' /C calc\'!A0';
    const sanitized = sanitizeCsvCell(rawFormula);
    expect(sanitized).toBe("\"'=cmd|' /C calc'!A0\"");

    // Minus formula: -2+3+cmd|' /C calc'!A0
    expect(sanitizeCsvCell('-5+10')).toBe("\"'-5+10\"");

    // Plus formula: +12345
    expect(sanitizeCsvCell('+12345')).toBe("\"'+12345\"");

    // At symbol formula: @SUM(1,2)
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("\"'@SUM(A1:A10)\"");
  });

  it('generates an injection-safe CSV file', () => {
    const headers = ['Company', 'Contact', 'Notes'];
    const rows = [
      { Company: 'Safe Corp', Contact: 'Alice', Notes: 'Normal note' },
      { Company: '=2+5', Contact: '@evil', Notes: '-bad command' },
    ];

    const csv = generateSafeCsv(headers, rows);
    expect(csv).toContain("\"'=2+5\"");
    expect(csv).toContain("\"'@evil\"");
    expect(csv).toContain("\"'-bad command\"");
    expect(csv).toContain('"Safe Corp"');
  });
});
