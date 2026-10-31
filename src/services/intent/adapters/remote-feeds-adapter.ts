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
  public readonly name = 'RemoteOK, WeWorkRemotely & Remotive Developer Feeds';

  public async fetchRecentJobs(): Promise<RawJobFeedItem[]> {
    const results: RawJobFeedItem[] = [];

    // 1. Remotive Public API (Software Development)
    try {
      const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=15', {
        headers: { 'User-Agent': 'GrowthSystemAgent/1.0' },
        signal: AbortSignal.timeout(5000),
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
      // Non-fatal network timeout
    }

    // 2. RemoteOK Public JSON API
    try {
      const res = await fetch('https://remoteok.com/api?tag=python', {
        headers: { 'User-Agent': 'GrowthSystemAgent/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        // First item in RemoteOK is a legal disclaimer object
        const jobs = Array.isArray(data) ? data.filter(item => Boolean(item.id && item.position)) : [];
        for (const j of jobs.slice(0, 10)) {
          results.push({
            id: `remoteok_${j.id}`,
            title: j.position,
            company: j.company || 'Direct Client',
            url: j.url || `https://remoteok.com/l/${j.id}`,
            tags: j.tags || ['python', 'ai'],
            description: (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 500),
            source: 'RemoteOK',
            createdAt: j.date || new Date().toISOString(),
          });
        }
      }
    } catch {
      // Non-fatal
    }

    // 3. WeWorkRemotely Public Feed
    try {
      const res = await fetch('https://weworkremotely.com/categories/remote-programming-jobs.rss', {
        headers: { 'User-Agent': 'GrowthSystemAgent/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const xml = await res.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        for (const item of items.slice(0, 10)) {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
          const linkMatch = item.match(/<link>(.*?)<\/link>/);
          const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
          const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

          const fullTitle = titleMatch ? titleMatch[1] : 'Developer Project';
          const [companyPart, rolePart] = fullTitle.includes(':') ? fullTitle.split(':') : ['Tech Employer', fullTitle];

          results.push({
            id: `wwr_${Math.abs(hashString(linkMatch ? linkMatch[1] : fullTitle))}`,
            title: (rolePart || fullTitle).trim(),
            company: companyPart.trim(),
            url: linkMatch ? linkMatch[1] : 'https://weworkremotely.com',
            tags: ['programming', 'contract'],
            description: (descMatch ? descMatch[1] : '').replace(/<[^>]+>/g, ' ').slice(0, 500),
            source: 'WeWorkRemotely',
            createdAt: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
          });
        }
      }
    } catch {
      // Non-fatal
    }

    return results;
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
