import { BusinessEntity, ContactEntity, PipelineType } from '@/types';
import { normalizeBusinessName, normalizeEmail } from '@/services/crm/normalization';
import { normalizeDomain } from '@/services/website/verifier';
import { dataStore } from '@/services/repository/data-store';
import crypto from 'crypto';

export interface CsvColumnMapping {
  companyColumn: string;
  domainColumn?: string;
  nameColumn?: string;
  titleColumn?: string;
  emailColumn?: string;
  linkedinColumn?: string;
  sourceUrlColumn?: string;
  notesColumn?: string;
}

export interface ImportLeadResult {
  totalProcessed: number;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  leads: Array<{
    business: BusinessEntity;
    contact?: ContactEntity;
  }>;
  errors: string[];
}

export class CsvLeadImporter {
  public parseCsvRows(csvContent: string): string[][] {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map(line => {
      // Split by comma respecting quotes
      const row: string[] = [];
      let inQuotes = false;
      let curr = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(curr.trim().replace(/^"|"$/g, ''));
          curr = '';
        } else {
          curr += char;
        }
      }
      row.push(curr.trim().replace(/^"|"$/g, ''));
      return row;
    });
  }

  public async importFromCsv(
    csvContent: string,
    mapping: CsvColumnMapping,
    sourcePlatform: string = 'csv_import'
  ): Promise<ImportLeadResult> {
    const rows = this.parseCsvRows(csvContent);
    if (rows.length < 2) {
      return { totalProcessed: 0, importedCount: 0, duplicateCount: 0, invalidCount: 0, leads: [], errors: ['CSV has no data rows'] };
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const getIndex = (colName?: string) => {
      if (!colName) return -1;
      return headers.indexOf(colName.trim().toLowerCase());
    };

    const companyIdx = getIndex(mapping.companyColumn);
    const domainIdx = getIndex(mapping.domainColumn);
    const nameIdx = getIndex(mapping.nameColumn);
    const titleIdx = getIndex(mapping.titleColumn);
    const emailIdx = getIndex(mapping.emailColumn);
    const linkedinIdx = getIndex(mapping.linkedinColumn);
    const sourceUrlIdx = getIndex(mapping.sourceUrlColumn);
    const notesIdx = getIndex(mapping.notesColumn);

    if (companyIdx === -1 && domainIdx === -1) {
      return { totalProcessed: 0, importedCount: 0, duplicateCount: 0, invalidCount: 0, leads: [], errors: ['Either Company or Domain column is required'] };
    }

    const existingBiz = await dataStore.getBusinesses({ limit: 5000, includeDemo: true });
    const existingDomains = new Set(existingBiz.businesses.map(b => b.normalizedDomain).filter(Boolean));
    const existingNames = new Set(existingBiz.businesses.map(b => b.normalizedName));

    const result: ImportLeadResult = {
      totalProcessed: rows.length - 1,
      importedCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      leads: [],
      errors: [],
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rawCompany = companyIdx >= 0 && row[companyIdx] ? row[companyIdx].trim() : '';
      const rawDomain = domainIdx >= 0 && row[domainIdx] ? row[domainIdx].trim() : '';
      const rawName = nameIdx >= 0 && row[nameIdx] ? row[nameIdx].trim() : '';
      const rawTitle = titleIdx >= 0 && row[titleIdx] ? row[titleIdx].trim() : 'Decision Maker';
      const rawEmail = emailIdx >= 0 && row[emailIdx] ? row[emailIdx].trim() : '';
      const rawLinkedin = linkedinIdx >= 0 && row[linkedinIdx] ? row[linkedinIdx].trim() : '';
      const rawSourceUrl = sourceUrlIdx >= 0 && row[sourceUrlIdx] ? row[sourceUrlIdx].trim() : null;
      const rawNotes = notesIdx >= 0 && row[notesIdx] ? row[notesIdx].trim() : '';

      if (!rawCompany && !rawDomain) {
        result.invalidCount++;
        continue;
      }

      const normDomain = rawDomain ? normalizeDomain(rawDomain) : null;
      const compName = rawCompany || (normDomain ? normDomain.split('.')[0] : 'Unknown Business');
      const normName = normalizeBusinessName(compName);

      // Deduplication check
      if ((normDomain && existingDomains.has(normDomain)) || existingNames.has(normName)) {
        result.duplicateCount++;
        continue;
      }

      // Email validation if email provided
      let validEmail: string | null = null;
      let emailVerified = false;
      if (rawEmail) {
        const normEm = normalizeEmail(rawEmail);
        if (normEm && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEm)) {
          validEmail = normEm;
          emailVerified = true;
        }
      }

      const bizId = `lead_import_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const business: BusinessEntity = {
        id: bizId,
        organizationId: 'org_operator',
        name: compName,
        normalizedName: normName,
        domain: normDomain,
        normalizedDomain: normDomain,
        country: 'GLOBAL',
        pipelineType: 'ai_software_opportunities' as PipelineType,
        qualificationStatus: 'qualified',
        sourceProvider: sourcePlatform,
        sourceIdentifier: rawSourceUrl || `${sourcePlatform}_csv_row_${i}`,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let contact: ContactEntity | undefined;
      if (validEmail || rawName || rawLinkedin) {
        contact = {
          id: `cont_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          businessId: bizId,
          fullName: rawName || compName,
          isPrimary: true,
          email: validEmail,
          firstName: rawName.split(' ')[0] || '',
          lastName: rawName.split(' ').slice(1).join(' ') || '',
          title: rawTitle,
          linkedinUrl: rawLinkedin || null,
          confidence: emailVerified ? 85 : 50,
          verificationStatus: emailVerified ? 'verified' : 'unverified',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      await dataStore.saveBusiness(business);
      if (contact) {
        await dataStore.saveContact(contact);
      }

      existingNames.add(normName);
      if (normDomain) existingDomains.add(normDomain);

      result.leads.push({ business, contact });
      result.importedCount++;
    }

    return result;
  }

  public async importFromPastedText(
    text: string,
    sourcePlatform: string = 'paste_importer'
  ): Promise<ImportLeadResult> {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const linkedinRegex = /(https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[^\s]+)/gi;

    const emails = text.match(emailRegex) || [];
    const urls = text.match(urlRegex) || [];
    const linkedinMatches = text.match(linkedinRegex) || [];

    const firstUrl = urls.find(u => !u.includes('linkedin.com')) || null;
    let domain: string | null = null;
    if (firstUrl) {
      try {
        const parsed = new URL(firstUrl);
        domain = normalizeDomain(parsed.hostname);
      } catch {}
    }

    const firstEmail = emails.length > 0 ? normalizeEmail(emails[0]) : null;
    if (!domain && firstEmail) {
      domain = firstEmail.split('@')[1];
    }

    if (!domain && !firstEmail && urls.length === 0) {
      return {
        totalProcessed: 1,
        importedCount: 0,
        duplicateCount: 0,
        invalidCount: 1,
        leads: [],
        errors: ['Could not extract any company domain, website URL, or email from pasted text'],
      };
    }

    const compName = domain ? domain.split('.')[0].replace(/[^a-zA-Z0-9]/g, ' ') : 'Pasted Account Lead';
    const bizId = `lead_paste_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    
    const business: BusinessEntity = {
      id: bizId,
      organizationId: 'org_operator',
      name: compName.toUpperCase(),
      normalizedName: normalizeBusinessName(compName),
      domain,
      normalizedDomain: domain,
      country: 'GLOBAL',
      pipelineType: 'ai_software_opportunities' as PipelineType,
      qualificationStatus: 'qualified',
      sourceProvider: sourcePlatform,
      sourceIdentifier: firstUrl || `pasted_text_${Date.now()}`,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let contact: ContactEntity | undefined;
    if (firstEmail || linkedinMatches.length > 0) {
      contact = {
        id: `cont_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        businessId: bizId,
        fullName: compName,
        isPrimary: true,
        email: firstEmail,
        firstName: '',
        lastName: '',
        title: 'Decision Maker',
        linkedinUrl: linkedinMatches[0] || null,
        confidence: firstEmail ? 80 : 60,
        verificationStatus: firstEmail ? 'verified' : 'unverified',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    await dataStore.saveBusiness(business);
    if (contact) await dataStore.saveContact(contact);

    return {
      totalProcessed: 1,
      importedCount: 1,
      duplicateCount: 0,
      invalidCount: 0,
      leads: [{ business, contact }],
      errors: [],
    };
  }
}

export const csvLeadImporter = new CsvLeadImporter();
