import { IDiscoveryProvider, RawDiscoveredLead } from '../types';
import { DiscoveryRequest } from '@/lib/validation/schemas';

/**
 * UK Companies House API Provider Adapter
 * Queries the official UK Companies House REST API for registered corporations.
 * Requires COMPANIES_HOUSE_API_KEY in environment.
 */
export class CompaniesHouseProvider implements IDiscoveryProvider {
  public readonly id = 'companies_house';
  public readonly name = 'UK Companies House Public Register';

  public isConfigured(): boolean {
    return Boolean(process.env.COMPANIES_HOUSE_API_KEY && process.env.COMPANIES_HOUSE_API_KEY.trim().length > 0);
  }

  public async discover(request: DiscoveryRequest): Promise<RawDiscoveredLead[]> {
    if (!this.isConfigured()) {
      throw new Error('UK Companies House API is unconfigured: COMPANIES_HOUSE_API_KEY environment variable is missing.');
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY!;
    const query = encodeURIComponent(request.industry || request.keywords.join(' ') || 'software');
    const url = `https://api.company-information.service.gov.uk/search/companies?q=${query}&items_per_page=${Math.min(request.limit, 20)}`;

    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Companies House API returned error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const items = data.items || [];

    return items
      .filter((company: any) => company.company_status === 'active')
      .map((company: any): RawDiscoveredLead => {
        const address = company.address_snippet || '';
        const companyNumber = company.company_number;

        return {
          name: company.title,
          domain: null, // Companies House register does not index URLs; website verifier checks domain separately
          country: 'UK',
          address,
          industry: request.industry,
          companyType: company.company_type,
          sourceProvider: 'uk_companies_house',
          sourceIdentifier: companyNumber,
          evidence: [
            {
              sourceName: 'UK Companies House',
              sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`,
              observationTime: new Date().toISOString(),
              evidenceType: 'statutory_incorporation',
              summary: `Incorporated UK company #${companyNumber} with active statutory status.`,
              isFactual: true,
              confidence: 0.99,
            },
          ],
        };
      });
  }
}
