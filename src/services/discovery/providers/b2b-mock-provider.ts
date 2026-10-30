import { IDiscoveryProvider, RawDiscoveredLead } from '../types';
import { DiscoveryRequest } from '@/lib/validation/schemas';

export class B2BMockProvider implements IDiscoveryProvider {
  public readonly id = 'b2b_mock';
  public readonly name = 'Licensed B2B Registry (Synthetic Sandbox Adapter)';

  public isConfigured(): boolean {
    return true; // Always available for local sandbox, dev, and automated testing
  }

  public async discover(request: DiscoveryRequest): Promise<RawDiscoveredLead[]> {
    const { market, targetPipeline, industry, limit } = request;
    const leads: RawDiscoveredLead[] = [];

    // Pipeline A Leads (Website Opportunities: active businesses without functional websites)
    const pipelineALeads: RawDiscoveredLead[] = [
      {
        name: 'Vanguard Precision HVAC & Plumbing',
        domain: null,
        country: market === 'GLOBAL' ? 'US' : market,
        region: 'Texas',
        city: 'Austin',
        postalCode: '78701',
        address: '1420 Colorado St, Austin, TX 78701',
        phone: '+1-512-555-0142',
        industry: 'HVAC & Facility Maintenance',
        companyType: 'Commercial Services LLC',
        employeeCountRange: '10-25',
        annualRevenueRange: '$1M - $3M',
        sourceProvider: 'b2b_mock',
        sourceIdentifier: 'gplace_vanguard_hvac_78701',
        socialUrls: ['https://facebook.com/vanguardhvacatx'],
        evidence: [
          {
            sourceName: 'Austin Business Journal & Commercial Register',
            sourceUrl: 'https://records.traviscountytx.gov/commercial/vanguard-hvac',
            observationTime: new Date(Date.now() - 14 * 86400000).toISOString(),
            evidenceType: 'commercial_registration',
            summary: 'Active commercial HVAC license and business registry active in Travis County since 2021.',
            isFactual: true,
            confidence: 0.95,
          },
          {
            sourceName: 'Google Business Profile Reviews',
            sourceUrl: 'https://maps.google.com/?cid=1029384756',
            observationTime: new Date(Date.now() - 3 * 86400000).toISOString(),
            evidenceType: 'customer_review_velocity',
            summary: 'Received 48 verified customer reviews with 4.8 star average over past 6 months; consistent customer transaction volume.',
            isFactual: true,
            confidence: 0.90,
          },
          {
            sourceName: 'Indeed Local Hiring',
            sourceUrl: 'https://www.indeed.com/cmp/vanguard-hvac/jobs',
            observationTime: new Date(Date.now() - 7 * 86400000).toISOString(),
            evidenceType: 'hiring_activity',
            summary: 'Posted open positions for 2 journeyman technicians and a full-time dispatcher.',
            isFactual: true,
            confidence: 0.88,
          },
        ],
        contacts: [
          {
            fullName: 'Marcus Vance',
            firstName: 'Marcus',
            lastName: 'Vance',
            title: 'Managing Partner & Head of Operations',
            email: 'marcus.vance@vanguardhvac-service.internal',
            phone: '+1-512-555-0142',
            linkedinUrl: 'https://linkedin.com/in/marcus-vance-hvac',
            confidence: 0.85,
            verificationStatus: 'verified',
            isPrimary: true,
          },
        ],
      },
      {
        name: 'Apex Artisan Bakery & Provisions',
        domain: 'apexartisanbakery.com', // Parked domain scenario
        country: market === 'GLOBAL' ? 'UK' : market,
        region: 'Greater London',
        city: 'London',
        postalCode: 'EC1A 1BB',
        address: '45 Clerkenwell Rd, London EC1A 1BB',
        phone: '+44 20 7946 0912',
        industry: 'Hospitality & Commercial Food Supply',
        companyType: 'Private Limited Company',
        employeeCountRange: '15-30',
        annualRevenueRange: '£800k - £2M',
        sourceProvider: 'b2b_mock',
        sourceIdentifier: 'uk_ch_12984712',
        socialUrls: ['https://instagram.com/apexartisanlondon'],
        evidence: [
          {
            sourceName: 'UK Companies House',
            sourceUrl: 'https://find-and-update.company-information.service.gov.uk/company/12984712',
            observationTime: new Date(Date.now() - 30 * 86400000).toISOString(),
            evidenceType: 'corporate_filing',
            summary: 'Active UK LTD filing with confirmation statement and profitable accounts filed.',
            isFactual: true,
            confidence: 0.98,
          },
          {
            sourceName: 'Instagram Business Channel',
            sourceUrl: 'https://instagram.com/apexartisanlondon',
            observationTime: new Date(Date.now() - 2 * 86400000).toISOString(),
            evidenceType: 'social_commerce_signals',
            summary: 'Over 14,000 followers with active daily stories taking catering orders manually via direct messages.',
            isFactual: true,
            confidence: 0.92,
          },
        ],
        contacts: [
          {
            fullName: 'Charlotte Davies',
            firstName: 'Charlotte',
            lastName: 'Davies',
            title: 'Founder & Commercial Director',
            email: 'charlotte@apexartisanbakery.co.uk',
            phone: '+44 20 7946 0912',
            confidence: 0.88,
            verificationStatus: 'verified',
            isPrimary: true,
          },
        ],
      },
      {
        name: 'Starlight Family Dental Clinic',
        domain: null,
        country: market === 'GLOBAL' ? 'CA' : market,
        region: 'Ontario',
        city: 'Toronto',
        postalCode: 'M5V 2T6',
        address: '320 Front St W, Toronto, ON M5V 2T6',
        phone: '+1-416-555-0189',
        industry: 'Healthcare & Dental Practice',
        companyType: 'Professional Practice',
        employeeCountRange: '5-15',
        annualRevenueRange: '$800K - $1.5M CAD',
        sourceProvider: 'b2b_mock',
        sourceIdentifier: 'gplace_starlight_dental_toronto',
        evidence: [
          {
            sourceName: 'Royal College of Dental Surgeons of Ontario',
            sourceUrl: 'https://www.rcdso.org/en-ca/registry/starlight-dental',
            observationTime: new Date(Date.now() - 20 * 86400000).toISOString(),
            evidenceType: 'professional_accreditation',
            summary: 'Verified active clinical licensing and multi-practitioner practice.',
            isFactual: true,
            confidence: 0.96,
          },
          {
            sourceName: 'Google Reviews Directory',
            sourceUrl: 'https://maps.google.com/?cid=9988776655',
            observationTime: new Date(Date.now() - 4 * 86400000).toISOString(),
            evidenceType: 'customer_review_velocity',
            summary: '73 positive patient reviews; multiple reviews cite waiting for phone calls to book appointments.',
            isFactual: true,
            confidence: 0.89,
          },
        ],
        contacts: [
          {
            fullName: 'Dr. Evelyn Chen',
            firstName: 'Evelyn',
            lastName: 'Chen',
            title: 'Lead Practitioner & Practice Owner',
            email: 'dr.chen@starlightdental.ca',
            phone: '+1-416-555-0189',
            confidence: 0.90,
            verificationStatus: 'verified',
            isPrimary: true,
          },
        ],
      },
    ];

    // Pipeline B Leads (AI & Software Opportunities)
    const pipelineBLeads: RawDiscoveredLead[] = [
      {
        name: 'DocuSync Logistics Cloud',
        domain: 'docusynclogistics.io',
        country: market === 'GLOBAL' ? 'US' : market,
        region: 'Illinois',
        city: 'Chicago',
        postalCode: '60606',
        address: '222 W Adams St, Chicago, IL 60606',
        phone: '+1-312-555-0198',
        industry: 'Supply Chain SaaS & Logistics Tech',
        companyType: 'B2B SaaS Startup',
        employeeCountRange: '15-40',
        annualRevenueRange: '$2M - $5M',
        sourceProvider: 'b2b_mock',
        sourceIdentifier: 'techdir_docusync_chicago',
        evidence: [
          {
            sourceName: 'LinkedIn Job Postings',
            sourceUrl: 'https://linkedin.com/jobs/view/docusync-senior-python-rag-engineer',
            observationTime: new Date(Date.now() - 5 * 86400000).toISOString(),
            evidenceType: 'hiring_signal',
            summary: 'Actively recruiting for Senior Python Engineer with RAG, LangChain, and FastAPI expertise to automate bill-of-lading document parsing.',
            isFactual: true,
            confidence: 0.95,
          },
          {
            sourceName: 'TechCrunch / PR Newswire Release',
            sourceUrl: 'https://techcrunch.com/2026/08/15/docusync-seed-round',
            observationTime: new Date(Date.now() - 60 * 86400000).toISOString(),
            evidenceType: 'funding_and_expansion',
            summary: 'Closed $2.8M Seed round to expand automated freight document intelligence capabilities.',
            isFactual: true,
            confidence: 0.98,
          },
          {
            sourceName: 'BuiltWith Technology Stack Audit',
            sourceUrl: 'https://builtwith.com/docusynclogistics.io',
            observationTime: new Date(Date.now() - 10 * 86400000).toISOString(),
            evidenceType: 'tech_stack_detected',
            summary: 'Detected React, Next.js, FastAPI, PostgreSQL, and AWS infrastructure with expanding REST endpoints.',
            isFactual: true,
            confidence: 0.92,
          },
        ],
        contacts: [
          {
            fullName: 'Alexander Wright',
            firstName: 'Alexander',
            lastName: 'Wright',
            title: 'VP of Product & Engineering',
            email: 'alex.wright@docusynclogistics.io',
            phone: '+1-312-555-0198',
            linkedinUrl: 'https://linkedin.com/in/alex-wright-tech',
            confidence: 0.94,
            verificationStatus: 'verified',
            isPrimary: true,
          },
        ],
      },
      {
        name: 'Horizon Growth Partners Agency',
        domain: 'horizongrowth.co.uk',
        country: market === 'GLOBAL' ? 'UK' : market,
        region: 'Manchester',
        city: 'Manchester',
        postalCode: 'M1 1AD',
        address: '100 Piccadilly, Manchester M1 1AD',
        phone: '+44 161 496 0382',
        industry: 'B2B Marketing & Digital Strategy Agency',
        companyType: 'Digital Agency',
        employeeCountRange: '20-50',
        annualRevenueRange: '£2.5M - £6M',
        sourceProvider: 'b2b_mock',
        sourceIdentifier: 'clutch_horizongrowth_uk',
        evidence: [
          {
            sourceName: 'Agency Portfolio & Public Case Studies',
            sourceUrl: 'https://horizongrowth.co.uk/services/ai-solutions',
            observationTime: new Date(Date.now() - 12 * 86400000).toISOString(),
            evidenceType: 'commercial_service_demand',
            summary: 'Publicly launched "AI Growth Lab" service offering for enterprise clients but agency leadership openly seeks senior technical subcontracting partners.',
            isFactual: true,
            confidence: 0.90,
          },
          {
            sourceName: 'Substack / Agency Founder Post',
            sourceUrl: 'https://agencygrowthpulse.substack.com/p/scaling-tech-capacity-2026',
            observationTime: new Date(Date.now() - 8 * 86400000).toISOString(),
            evidenceType: 'leadership_statement',
            summary: 'Founder highlighted bottleneck in finding trusted senior full-stack AI automation developers for white-label client projects.',
            isFactual: true,
            confidence: 0.88,
          },
        ],
        contacts: [
          {
            fullName: 'Liam Thorne',
            firstName: 'Liam',
            lastName: 'Thorne',
            title: 'Managing Director & Partner',
            email: 'liam@horizongrowth.co.uk',
            phone: '+44 161 496 0382',
            linkedinUrl: 'https://linkedin.com/in/liamthorne-agency',
            confidence: 0.92,
            verificationStatus: 'verified',
            isPrimary: true,
          },
        ],
      },
      {
        name: 'Quantara Health Data Systems',
        domain: 'quantarahealth.com.au',
        country: market === 'GLOBAL' ? 'AU' : market,
        region: 'New South Wales',
        city: 'Sydney',
        postalCode: 'NSW 2000',
        address: '1 Martin Place, Sydney NSW 2000',
        phone: '+61 2 8901 2345',
        industry: 'HealthTech & Clinical Data Analytics',
        companyType: 'HealthTech Scale-up',
        employeeCountRange: '30-70',
        annualRevenueRange: '$4M - $8M AUD',
        sourceProvider: 'b2b_mock',
        sourceIdentifier: 'abr_quantara_sydney',
        evidence: [
          {
            sourceName: 'Australian Business Register (ABR)',
            sourceUrl: 'https://abr.business.gov.au/ABN/View?id=88123456789',
            observationTime: new Date(Date.now() - 45 * 86400000).toISOString(),
            evidenceType: 'official_corporate_registry',
            summary: 'Active corporate entity registered in NSW with multiple GST and innovation grant credits.',
            isFactual: true,
            confidence: 0.96,
          },
          {
            sourceName: 'Seek & LinkedIn Jobs',
            sourceUrl: 'https://www.seek.com.au/job/quantara-python-etl-data-scientist',
            observationTime: new Date(Date.now() - 3 * 86400000).toISOString(),
            evidenceType: 'hiring_signal',
            summary: 'Actively recruiting for Senior Python ETL Developer and Data Science contractor to build automated clinical trial ingestion pipelines.',
            isFactual: true,
            confidence: 0.95,
          },
        ],
        contacts: [
          {
            fullName: 'Dr. Sarah MacIntyre',
            firstName: 'Sarah',
            lastName: 'MacIntyre',
            title: 'Chief Technology Officer',
            email: 's.macintyre@quantarahealth.com.au',
            phone: '+61 2 8901 2345',
            linkedinUrl: 'https://linkedin.com/in/sarah-macintyre-cto',
            confidence: 0.95,
            verificationStatus: 'verified',
            isPrimary: true,
          },
        ],
      },
    ];

    if (targetPipeline === 'website_opportunities') {
      leads.push(...pipelineALeads);
    } else if (targetPipeline === 'ai_software_opportunities') {
      leads.push(...pipelineBLeads);
    } else {
      leads.push(...pipelineALeads, ...pipelineBLeads);
    }

    // Filter by industry keyword if specified
    let filtered = leads;
    if (industry && industry !== 'all' && industry !== 'All Industries') {
      const lower = industry.toLowerCase();
      filtered = filtered.filter(l => 
        (l.industry && l.industry.toLowerCase().includes(lower)) ||
        l.name.toLowerCase().includes(lower)
      );
      if (filtered.length === 0) filtered = leads; // Fallback to avoid empty result set in test runs
    }

    return filtered.slice(0, limit);
  }
}
