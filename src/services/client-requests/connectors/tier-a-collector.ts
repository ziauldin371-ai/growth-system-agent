/**
 * Tier A Source Connectors (Official APIs & Public Feeds)
 * Hacker News, RemoteOK, We Work Remotely, Remotive, Himalayas, Working Nomads
 */

export interface RawPublicPost {
  sourcePlatform: string;
  sourceUrl: string;
  sourcePostId: string;
  postUrl: string;
  authorName?: string;
  authorUsername?: string;
  companyName?: string;
  title: string;
  content: string;
  publishedAt: string;
  tags?: string[];
}

const DEFAULT_TIMEOUT_MS = 8000;

function getUserAgent(): string {
  const contact = process.env.ADMIN_EMAIL || 'ziauldin371@gmail.com';
  return `GrowthSystemAgent/1.0 (Lead Discovery; mailto:${contact})`;
}

/**
 * 1. Hacker News Connector
 * Reads from Y Combinator's official Firebase API.
 */
export async function fetchHackerNewsPosts(limit = 15): Promise<RawPublicPost[]> {
  try {
    // 1. Fetch top stories or search for whoishiring stories
    const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/user/whoishiring.json', {
      headers: { 'User-Agent': getUserAgent() },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    let storyIds: number[] = [];
    if (topStoriesRes.ok) {
      const userObj = await topStoriesRes.json();
      storyIds = (userObj.submitted || []).slice(0, 3);
    }

    if (storyIds.length === 0) {
      // Fallback to recent top story
      const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
        headers: { 'User-Agent': getUserAgent() },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (topRes.ok) {
        const ids = await topRes.json();
        storyIds = ids.slice(0, 3);
      }
    }

    const posts: RawPublicPost[] = [];

    for (const sId of storyIds) {
      const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${sId}.json`, {
        headers: { 'User-Agent': getUserAgent() },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (!itemRes.ok) continue;
      const item = await itemRes.json();
      if (!item || !item.kids) continue;

      // Sample first 5 kids (comments)
      const commentIds = item.kids.slice(0, Math.min(limit, 10));
      for (const cId of commentIds) {
        const cRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${cId}.json`, {
          headers: { 'User-Agent': getUserAgent() },
          signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
        });
        if (!cRes.ok) continue;
        const c = await cRes.json();
        if (c && c.text && !c.deleted && !c.dead) {
          // Clean HTML tags from HN text
          const plainText = c.text
            .replace(/<p>/gi, '\n\n')
            .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/&#x27;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .trim();

          posts.push({
            sourcePlatform: 'Hacker News',
            sourceUrl: `https://news.ycombinator.com/item?id=${c.id}`,
            sourcePostId: String(c.id),
            postUrl: `https://news.ycombinator.com/item?id=${c.id}`,
            authorUsername: c.by || undefined,
            title: item.title || 'Hacker News Posting',
            content: plainText,
            publishedAt: c.time ? new Date(c.time * 1000).toISOString() : new Date().toISOString(),
          });
        }
      }
      if (posts.length >= limit) break;
    }

    return posts;
  } catch (err) {
    console.warn('[HN_CONNECTOR] Failed to fetch Hacker News posts:', err);
    return [];
  }
}

/**
 * 2. RemoteOK Connector
 * Official public JSON feed.
 */
export async function fetchRemoteOkPosts(limit = 15): Promise<RawPublicPost[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[REMOTEOK_CONNECTOR] HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // First element in RemoteOK JSON is metadata / disclaimer
    const jobs = data.filter(item => item && item.id && item.position).slice(0, limit);

    return jobs.map(j => {
      const plainDesc = (j.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        sourcePlatform: 'Remote OK',
        sourceUrl: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        sourcePostId: String(j.id),
        postUrl: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        companyName: j.company || undefined,
        title: j.position || 'Software Engineer',
        content: `${j.position} at ${j.company || 'Company'}. ${plainDesc.slice(0, 1000)}`,
        publishedAt: j.date || new Date().toISOString(),
        tags: Array.isArray(j.tags) ? j.tags : [],
      };
    });
  } catch (err) {
    console.warn('[REMOTEOK_CONNECTOR] Failed to fetch RemoteOK posts:', err);
    return [];
  }
}

/**
 * 3. We Work Remotely Connector
 * Official public RSS feed.
 */
export async function fetchWeWorkRemotelyPosts(limit = 15): Promise<RawPublicPost[]> {
  try {
    const res = await fetch('https://weworkremotely.com/categories/remote-programming-jobs.rss', {
      headers: {
        'User-Agent': getUserAgent(),
        Accept: 'application/rss+xml, text/xml',
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) return [];
    const xml = await res.text();

    const posts: RawPublicPost[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && posts.length < limit) {
      const itemBlock = match[1];
      const titleMatch = itemBlock.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemBlock.match(/<title>(.*?)<\/title>/i);
      const linkMatch = itemBlock.match(/<link>(.*?)<\/link>/i);
      const guidMatch = itemBlock.match(/<guid[^>]*>(.*?)<\/guid>/i);
      const descMatch = itemBlock.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || itemBlock.match(/<description>([\s\S]*?)<\/description>/i);
      const pubDateMatch = itemBlock.match(/<pubDate>(.*?)<\/pubDate>/i);

      const title = titleMatch ? titleMatch[1].trim() : 'Remote Opportunity';
      const link = linkMatch ? linkMatch[1].trim() : 'https://weworkremotely.com';
      const guid = guidMatch ? guidMatch[1].trim() : link;
      const rawDesc = descMatch ? descMatch[1] : '';
      const cleanDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // Extract company from title if "Company: Position" format
      let companyName: string | undefined;
      if (title.includes(':')) {
        companyName = title.split(':')[0].trim();
      }

      posts.push({
        sourcePlatform: 'We Work Remotely',
        sourceUrl: link,
        sourcePostId: guid,
        postUrl: link,
        companyName,
        title,
        content: `${title}. ${cleanDesc.slice(0, 1000)}`,
        publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
      });
    }

    return posts;
  } catch (err) {
    console.warn('[WWR_CONNECTOR] Failed to fetch WWR posts:', err);
    return [];
  }
}

/**
 * 4. Remotive Connector
 * Official public REST API.
 */
export async function fetchRemotivePosts(limit = 15): Promise<RawPublicPost[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=25', {
      headers: {
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.jobs)) return [];

    return data.jobs.slice(0, limit).map((j: any) => {
      const cleanDesc = (j.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        sourcePlatform: 'Remotive',
        sourceUrl: j.url || `https://remotive.com/remote-jobs/${j.id}`,
        sourcePostId: String(j.id),
        postUrl: j.url || `https://remotive.com/remote-jobs/${j.id}`,
        companyName: j.company_name,
        title: j.title || 'Developer Position',
        content: `${j.title} at ${j.company_name}. ${cleanDesc.slice(0, 1000)}`,
        publishedAt: j.publication_date || new Date().toISOString(),
        tags: Array.isArray(j.tags) ? j.tags : [],
      };
    });
  } catch (err) {
    console.warn('[REMOTIVE_CONNECTOR] Failed to fetch Remotive posts:', err);
    return [];
  }
}

/**
 * 5. Himalayas Connector
 * Official public API.
 */
export async function fetchHimalayasPosts(limit = 15): Promise<RawPublicPost[]> {
  try {
    const res = await fetch('https://himalayas.app/jobs/api?limit=25', {
      headers: {
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.jobs)) return [];

    return data.jobs.slice(0, limit).map((j: any) => {
      const cleanDesc = (j.description || j.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const jobUrl = j.applicationLink || `https://himalayas.app/companies/${j.companySlug || 'company'}/jobs/${j.slug || j.id || ''}`;

      return {
        sourcePlatform: 'Himalayas',
        sourceUrl: jobUrl,
        sourcePostId: String(j.id || j.slug),
        postUrl: jobUrl,
        companyName: j.companyName,
        title: j.title || 'Engineering Role',
        content: `${j.title} at ${j.companyName}. ${cleanDesc.slice(0, 1000)}`,
        publishedAt: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('[HIMALAYAS_CONNECTOR] Failed to fetch Himalayas posts:', err);
    return [];
  }
}

/**
 * 6. Working Nomads Connector
 * Official exposed JSON feed.
 */
export async function fetchWorkingNomadsPosts(limit = 15): Promise<RawPublicPost[]> {
  try {
    const res = await fetch('https://www.workingnomads.com/api/exposed_jobs/', {
      headers: {
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.slice(0, limit).map((j: any) => {
      const cleanDesc = (j.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        sourcePlatform: 'Working Nomads',
        sourceUrl: j.url || `https://www.workingnomads.com/jobs?job=${j.slug || j.id}`,
        sourcePostId: String(j.id || j.slug),
        postUrl: j.url || `https://www.workingnomads.com/jobs?job=${j.slug || j.id}`,
        companyName: j.company_name,
        title: j.title || 'Remote Developer',
        content: `${j.title} at ${j.company_name}. ${cleanDesc.slice(0, 1000)}`,
        publishedAt: j.pub_date || new Date().toISOString(),
        tags: Array.isArray(j.tags) ? j.tags : [],
      };
    });
  } catch (err) {
    console.warn('[WORKING_NOMADS_CONNECTOR] Failed to fetch Working Nomads posts:', err);
    return [];
  }
}

/**
 * Orchestrator: Fetches from all enabled Tier A sources with polite concurrency.
 */
export async function collectTierAPosts(options?: {
  sources?: string[];
  limitPerSource?: number;
}): Promise<Record<string, { posts: RawPublicPost[]; error?: string }>> {
  const limit = options?.limitPerSource || 10;
  const targetSources = options?.sources || [
    'hacker-news',
    'remote-ok',
    'we-work-remotely',
    'remotive',
    'himalayas',
    'working-nomads',
  ];

  const results: Record<string, { posts: RawPublicPost[]; error?: string }> = {};

  for (const src of targetSources) {
    try {
      if (src === 'hacker-news') {
        const posts = await fetchHackerNewsPosts(limit);
        results[src] = { posts };
      } else if (src === 'remote-ok') {
        const posts = await fetchRemoteOkPosts(limit);
        results[src] = { posts };
      } else if (src === 'we-work-remotely') {
        const posts = await fetchWeWorkRemotelyPosts(limit);
        results[src] = { posts };
      } else if (src === 'remotive') {
        const posts = await fetchRemotivePosts(limit);
        results[src] = { posts };
      } else if (src === 'himalayas') {
        const posts = await fetchHimalayasPosts(limit);
        results[src] = { posts };
      } else if (src === 'working-nomads') {
        const posts = await fetchWorkingNomadsPosts(limit);
        results[src] = { posts };
      }
    } catch (err: any) {
      results[src] = { posts: [], error: err.message || 'Unknown fetch error' };
    }
  }

  return results;
}
