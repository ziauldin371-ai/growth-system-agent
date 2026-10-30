export interface SearchPlanItem {
  id: string;
  country: string;
  region: string;
  city: string;
  industry: string;
  status: 'pending' | 'in_progress' | 'completed';
  nextPageToken?: string | null;
  pageNumber: number;
  lastRunAt?: string | null;
  leadsFoundCount: number;
}

export const SEED_COUNTRIES_AND_CITIES: Record<string, { region: string; cities: string[] }[]> = {
  US: [
    { region: 'New York', cities: ['New York City', 'Buffalo', 'Rochester'] },
    { region: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'] },
    { region: 'Texas', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'] },
    { region: 'Illinois', cities: ['Chicago', 'Naperville', 'Rockford'] },
    { region: 'Florida', cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'] },
    { region: 'Washington', cities: ['Seattle', 'Bellevue', 'Spokane'] },
    { region: 'Colorado', cities: ['Denver', 'Colorado Springs', 'Boulder'] },
    { region: 'Georgia', cities: ['Atlanta', 'Savannah', 'Augusta'] },
    { region: 'Massachusetts', cities: ['Boston', 'Cambridge', 'Worcester'] },
    { region: 'Pennsylvania', cities: ['Philadelphia', 'Pittsburgh'] },
  ],
  UK: [
    { region: 'Greater London', cities: ['London', 'Croydon', 'Bromley'] },
    { region: 'West Midlands', cities: ['Birmingham', 'Coventry', 'Wolverhampton'] },
    { region: 'Greater Manchester', cities: ['Manchester', 'Salford', 'Bolton'] },
    { region: 'West Yorkshire', cities: ['Leeds', 'Bradford', 'Wakefield'] },
    { region: 'Scotland', cities: ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee'] },
    { region: 'South West', cities: ['Bristol', 'Bath', 'Plymouth'] },
    { region: 'Merseyside', cities: ['Liverpool', 'Birkenhead'] },
    { region: 'Wales', cities: ['Cardiff', 'Swansea', 'Newport'] },
    { region: 'Northern Ireland', cities: ['Belfast', 'Derry'] },
  ],
  CA: [
    { region: 'Ontario', cities: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton'] },
    { region: 'Quebec', cities: ['Montreal', 'Quebec City', 'Laval'] },
    { region: 'British Columbia', cities: ['Vancouver', 'Surrey', 'Victoria', 'Burnaby'] },
    { region: 'Alberta', cities: ['Calgary', 'Edmonton'] },
  ],
  AU: [
    { region: 'New South Wales', cities: ['Sydney', 'Newcastle', 'Wollongong'] },
    { region: 'Victoria', cities: ['Melbourne', 'Geelong'] },
    { region: 'Queensland', cities: ['Brisbane', 'Gold Coast', 'Sunshine Coast'] },
    { region: 'Western Australia', cities: ['Perth', 'Fremantle'] },
    { region: 'South Australia', cities: ['Adelaide'] },
  ],
  NZ: [
    { region: 'Auckland', cities: ['Auckland'] },
    { region: 'Wellington', cities: ['Wellington'] },
    { region: 'Canterbury', cities: ['Christchurch'] },
  ],
  IE: [
    { region: 'Leinster', cities: ['Dublin'] },
    { region: 'Munster', cities: ['Cork', 'Limerick'] },
    { region: 'Connacht', cities: ['Galway'] },
  ],
  UAE: [
    { region: 'Dubai', cities: ['Dubai'] },
    { region: 'Abu Dhabi', cities: ['Abu Dhabi'] },
    { region: 'Sharjah', cities: ['Sharjah'] },
  ],
  EU: [
    { region: 'Germany', cities: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'] },
    { region: 'France', cities: ['Paris', 'Lyon', 'Marseille'] },
    { region: 'Netherlands', cities: ['Amsterdam', 'Rotterdam', 'The Hague'] },
    { region: 'Spain', cities: ['Madrid', 'Barcelona', 'Valencia'] },
    { region: 'Italy', cities: ['Rome', 'Milan'] },
    { region: 'Sweden', cities: ['Stockholm', 'Gothenburg'] },
  ],
};

export const SEED_INDUSTRIES = [
  'Dentists & Dental Clinics',
  'HVAC & Air Conditioning',
  'Plumbers & Emergency Plumbing',
  'Electricians & Electrical Contractors',
  'Roofers & Roofing Contractors',
  'Lawyers & Legal Practices',
  'Accountants & Tax Advisors',
  'Real Estate & Property Management',
  'Auto Repair & Mechanics',
  'Commercial Cleaning Services',
  'Veterinary & Pet Hospitals',
  'Physical Therapy & Chiropractic',
  'Hair Salons & Aesthetic Clinics',
  'Gyms & Personal Training Studios',
];

export class SearchPlanService {
  private planItems: Map<string, SearchPlanItem> = new Map();

  constructor() {
    this.initializePlan();
  }

  private initializePlan(): void {
    for (const [country, regions] of Object.entries(SEED_COUNTRIES_AND_CITIES)) {
      for (const reg of regions) {
        for (const city of reg.cities) {
          for (const industry of SEED_INDUSTRIES) {
            const id = `plan_${country.toLowerCase()}_${city.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${industry.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            this.planItems.set(id, {
              id,
              country,
              region: reg.region,
              city,
              industry,
              status: 'pending',
              nextPageToken: null,
              pageNumber: 1,
              lastRunAt: null,
              leadsFoundCount: 0,
            });
          }
        }
      }
    }
  }

  /**
   * Retrieves the next batch of unsearched or oldest searched targets to rotate globally.
   */
  public getNextTargets(count: number = 3): SearchPlanItem[] {
    const all = Array.from(this.planItems.values());

    // Priority 1: Targets with an active nextPageToken (continuing pagination)
    const inProgress = all.filter(t => t.status === 'in_progress' && t.nextPageToken);
    if (inProgress.length >= count) {
      return inProgress.slice(0, count);
    }

    // Priority 2: Never searched (pending)
    const pending = all.filter(t => t.status === 'pending');
    const combined = [...inProgress, ...pending];
    if (combined.length >= count) {
      return combined.slice(0, count);
    }

    // Priority 3: Oldest completed targets for rotation
    const completed = all
      .filter(t => t.status === 'completed')
      .sort((a, b) => new Date(a.lastRunAt || 0).getTime() - new Date(b.lastRunAt || 0).getTime());

    return [...combined, ...completed].slice(0, count);
  }

  /**
   * Updates target progress after an execution cycle.
   */
  public updateTargetProgress(
    id: string,
    nextPageToken: string | null | undefined,
    leadsFound: number
  ): void {
    const item = this.planItems.get(id);
    if (!item) return;

    item.lastRunAt = new Date().toISOString();
    item.leadsFoundCount += leadsFound;

    if (nextPageToken) {
      item.status = 'in_progress';
      item.nextPageToken = nextPageToken;
      item.pageNumber += 1;
    } else {
      item.status = 'completed';
      item.nextPageToken = null;
    }

    this.planItems.set(id, item);
  }

  /**
   * Returns human-readable global coverage progress for dashboard.
   */
  public getCoverageStats(): {
    totalTargets: number;
    completedCount: number;
    inProgressCount: number;
    pendingCount: number;
    percentage: number;
    recentProgressSummary: string;
    focusAreas: string[];
  } {
    const all = Array.from(this.planItems.values());
    const total = all.length;
    const completed = all.filter(t => t.status === 'completed').length;
    const inProgress = all.filter(t => t.status === 'in_progress').length;
    const pending = all.filter(t => t.status === 'pending').length;
    const percentage = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

    const activeList = all
      .filter(t => t.status === 'in_progress')
      .slice(0, 3)
      .map(t => `${t.city} ${t.industry}: Page ${t.pageNumber}`);

    const completedList = all
      .filter(t => t.status === 'completed')
      .slice(0, 2)
      .map(t => `${t.city} ${t.industry}: Done (${t.leadsFoundCount} leads)`);

    const summaryParts = [...activeList, ...completedList];
    const recentProgressSummary = summaryParts.length > 0
      ? summaryParts.join('; ')
      : 'Initial global sweep queued (US, UK, CA, AU, EU)';

    return {
      totalTargets: total,
      completedCount: completed,
      inProgressCount: inProgress,
      pendingCount: pending,
      percentage,
      recentProgressSummary,
      focusAreas: ['United States', 'United Kingdom', 'Canada', 'Australia', 'European Metros', 'UAE'],
    };
  }
}

export const searchPlanService = new SearchPlanService();

