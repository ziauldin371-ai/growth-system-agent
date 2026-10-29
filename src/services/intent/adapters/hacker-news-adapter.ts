export interface RawHNPost {
  id: string;
  title: string;
  url: string;
  author: string;
  text: string;
  createdAt: string;
}

export class HackerNewsAdapter {
  public readonly id = 'hacker_news';
  public readonly name = 'Hacker News (Algolia API)';

  public async fetchRecentHiringPosts(): Promise<RawHNPost[]> {
    try {
      const queries = ['"seeking freelancer"', '"who is hiring"', '"freelancer? seeking freelancer"', 'python automation', 'llm', 'rag'];
      const q = encodeURIComponent(queries[Math.floor(Math.random() * queries.length)]);
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=(story,comment)&hitsPerPage=15`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'GrowthSystemAgent/1.0 (Developer Intent Radar)' },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const hits = data.hits || [];

      return hits
        .filter((h: any) => Boolean(h.story_text || h.comment_text || h.title))
        .map((h: any): RawHNPost => ({
          id: String(h.objectID),
          title: h.story_title || h.title || 'Hacker News Freelance Discussion',
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          author: h.author || 'hn_user',
          text: (h.comment_text || h.story_text || '').replace(/<[^>]+>/g, ' '),
          createdAt: h.created_at || new Date().toISOString(),
        }));
    } catch {
      return [];
    }
  }
}

