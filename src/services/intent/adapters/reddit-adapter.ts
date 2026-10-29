export interface RawRedditPost {
  id: string;
  title: string;
  url: string;
  author: string;
  text: string;
  subreddit: string;
  createdAt: string;
}

export class RedditAdapter {
  public readonly id = 'reddit';
  public readonly name = 'Reddit Developer Subreddits';

  public async fetchRecentHiringPosts(): Promise<RawRedditPost[]> {
    try {
      // Queries public RSS/JSON endpoints on developer hiring subreddits
      const subreddits = 'forhire+hiring+startups+automation+LocalLLaMA';
      const url = `https://www.reddit.com/r/${subreddits}/new.json?limit=25`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'GrowthSystemAgent/1.0 (Lead Radar; contact: ziauldin371@gmail.com)',
        },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const children = data.data?.children || [];

      return children
        .filter((c: any) => Boolean(c.data?.selftext || c.data?.title))
        .map((c: any): RawRedditPost => ({
          id: c.data.id,
          title: c.data.title,
          url: `https://reddit.com${c.data.permalink}`,
          author: c.data.author,
          text: c.data.selftext || c.data.title,
          subreddit: c.data.subreddit,
          createdAt: new Date(c.data.created_utc * 1000).toISOString(),
        }));
    } catch {
      return [];
    }
  }
}
