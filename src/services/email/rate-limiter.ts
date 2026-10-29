export class RateLimiter {
  private domainSendCounts: Map<string, { count: number; windowStart: number }> = new Map();
  private dailyTotalSends: { count: number; dateString: string } = {
    count: 0,
    dateString: new Date().toISOString().slice(0, 10),
  };

  private readonly MAX_PER_DOMAIN_DAILY = 3;
  private readonly DEFAULT_DAILY_MAX = 50;

  public checkRateLimit(
    recipientEmail: string,
    customDailyCap?: number
  ): { allowed: boolean; reason?: string } {
    const today = new Date().toISOString().slice(0, 10);
    const maxDaily = customDailyCap || this.DEFAULT_DAILY_MAX;

    // 1. Reset daily count on new day
    if (this.dailyTotalSends.dateString !== today) {
      this.dailyTotalSends = { count: 0, dateString: today };
      this.domainSendCounts.clear();
    }

    // 2. Organization / Global Daily Cap
    if (this.dailyTotalSends.count >= maxDaily) {
      return {
        allowed: false,
        reason: `Daily sending limit reached (${this.dailyTotalSends.count}/${maxDaily} emails sent today). Additional sends queued for next day.`,
      };
    }

    // 3. Per-Domain Throttle (Max 3 outreach emails to same company per day)
    const domain = recipientEmail.includes('@') ? recipientEmail.split('@')[1].toLowerCase() : '';
    if (domain) {
      const current = this.domainSendCounts.get(domain) || { count: 0, windowStart: Date.now() };
      if (current.count >= this.MAX_PER_DOMAIN_DAILY) {
        return {
          allowed: false,
          reason: `Domain velocity limit reached for "${domain}" (maximum ${this.MAX_PER_DOMAIN_DAILY} emails/day). Prevents inbox flooding.`,
        };
      }
    }

    return { allowed: true };
  }

  public recordSend(recipientEmail: string): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyTotalSends.dateString !== today) {
      this.dailyTotalSends = { count: 0, dateString: today };
      this.domainSendCounts.clear();
    }

    this.dailyTotalSends.count++;

    const domain = recipientEmail.includes('@') ? recipientEmail.split('@')[1].toLowerCase() : '';
    if (domain) {
      const current = this.domainSendCounts.get(domain) || { count: 0, windowStart: Date.now() };
      this.domainSendCounts.set(domain, {
        count: current.count + 1,
        windowStart: current.windowStart,
      });
    }
  }

  public reset(): void {
    this.dailyTotalSends = { count: 0, dateString: new Date().toISOString().slice(0, 10) };
    this.domainSendCounts.clear();
  }
}

export const rateLimiter = new RateLimiter();

