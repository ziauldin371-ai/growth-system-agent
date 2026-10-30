import { IDiscoveryProvider, RawDiscoveredLead } from '../types';
import { DiscoveryRequest } from '@/lib/validation/schemas';
import { GrowthEvidenceEntity } from '@/types';

/**
 * UK Companies House API Provider Adapter
 * Queries the official UK Companies House REST API for registered corporations.
 * Supports advanced search for newly incorporated companies (last 90 days), active company filtering, and pagination.
 */
export class CompaniesHouseProvider implements IDiscoveryProvider {
  public readonly id = 'companies_house';
  public readonly name = 'UK Companies House Public Register';

  public isConfigured(): boolean {
    return Boolean(process.env.COMPANIES_HOUSE_API_KEY && process.env.COMPANIES_HOUSE_API_KEY.trim().length > 0);
  }

  public async discover(
    request: DiscoveryRequest & { startIndex?: number; newlyIncorporatedOnly?: boolean }
  ): Promise<RawDiscoveredLead[] & { nextStartIndex?: number | null }> {
    if (!this.isConfigured()) {
      throw new Error('UK Companies House key is missing. Configure COMPANIES_HOUSE_API_KEY in environment.');
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY!;
    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');
    const itemsPerPage = Math.min(request.limit || 20, 50);
    const startIndex = request.startIndex || 0;

    let url = '';
    const isNewOnly = Boolean(request.newlyIncorporatedOnly);

    if (isNewOnly) {
      // Advanced search: incorporated in last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const fromDate = ninetyDaysAgo.toISOString().split('T')[0];
      const toDate = new Date().toISOString().split('T')[0];
      const query = encodeURIComponent(request.industry || request.keywords?.join(' ') || 'services');

      url = `https://api.company-information.service.gov.uk/advanced-search/companies?company_name_includes=${query}&company_status=active&incorporated_from=${fromDate}&incorporated_to=${toDate}&size=${itemsPerPage}&start_index=${startIndex}`;
    } else {
      // Standard search: active companies by industry / keywords
      const query = encodeURIComponent(request.industry || request.keywords?.join(' ') || 'services');
      url = `https://api.company-information.service.gov.uk/search/companies?q=${query}&items_per_page=${itemsPerPage}&start_index=${startIndex}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Companies House API returned HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const items = data.items || [];
    const totalResults = data.total_results || items.length;
    const nextStartIndex = (startIndex + itemsPerPage < totalResults) ? startIndex + itemsPerPage : null;

    const leads: any = items
      .filter((company: any) => company.company_status === 'active')
      .map((company: any): RawDiscoveredLead => {
        const address = company.address_snippet || '';
        const companyNumber = company.company_number;
        const creationDate = company.date_of_creation;

        const evidence: GrowthEvidenceEntity[] = [
          {
            id: `ev_ch_${companyNumber}_incorp`,
            businessId: '',
            sourceName: 'UK Companies House',
            sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`,
            observationTime: new Date().toISOString(),
            evidenceType: 'statutory_incorporation',
            summary: `Active UK limited company #${companyNumber} officially registered on the Companies House public register.`,
            isFactual: true,
            confidence: 0.99,
            freshnessScore: 1.0,
            createdAt: new Date().toISOString(),
          },
        ];

        // If newly incorporated in last 90 days, add strong trigger signal
        if (creationDate) {
          const creationTs = new Date(creationDate).getTime();
          const daysOld = Math.floor((Date.now() - creationTs) / (1000 * 60 * 60 * 24));
          if (daysOld <= 90) {
            evidence.push({
              id: `ev_ch_${companyNumber}_recent_launch`,
              businessId: '',
              sourceName: 'UK Companies House Incorporation Register',
              sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`,
              observationTime: new Date().toISOString(),
              evidenceType: 'new_registration',
              summary: `Newly incorporated UK business (registered ${creationDate}, ${daysOld} days ago). Prime commercial window for website launch and automated infrastructure setup.`,
              isFactual: true,
              confidence: 0.98,
              freshnessScore: 1.0,
              createdAt: new Date().toISOString(),
            });
          }
        }

        return {
          name: company.title || company.company_name,
          domain: null, // Companies House register does not index URLs; website verifier checks domain separately
          country: 'UK',
          address,
          industry: request.industry,
          companyType: company.company_type || 'Private Limited Company',
          sourceProvider: 'companies_house',
          sourceIdentifier: companyNumber,
          fetchedAt: new Date().toISOString(),
          rawPayloadRef: {
            companyNumber,
            companyStatus: company.company_status,
            dateOfCreation: creationDate,
            companyType: company.company_type,
          },
          evidence,
        };
      });

    leads.nextStartIndex = nextStartIndex;
    return leads;
  }
}
