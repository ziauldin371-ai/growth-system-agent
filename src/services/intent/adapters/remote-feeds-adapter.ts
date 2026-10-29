export interface RawJobFeedItem {
  id: string;
  title: string;
  company: string;
  url: string;
  tags: string[];
  description: string;
  source: string;
  createdAt: string;
}

export class RemoteFeedsAdapter {
  public readonly id = 'remote_feeds';
  public readonly name = 'RemoteOK & Remotive Public Feeds';

  public async fetchRecentJobs(): Promise<RawJobFeedItem[]> {
    const results: RawJobFeedItem[] = [];

    // 1. Remotive Public API
    try {
      const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=15', {
        headers: { 'User-Agent': 'GrowthSystemAgent/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        const jobs = data.jobs || [];
        for (const j of jobs) {
          results.push({
            id: `remotive_${j.id}`,
            title: j.title,
            company: j.company_name || 'Tech Company',
            url: j.url,
            tags: j.tags || [],
            description: (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 500),
            source: 'Remotive',
            createdAt: j.publication_date || new Date().toISOString(),
          });
        }
      }
    } catch {
      // Graceful fallback
    }

    return results;
  }
}

