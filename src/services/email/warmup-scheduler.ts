export interface WarmupScheduleState {
  currentDay: number;
  dailyCap: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  isWarmupCompleted: boolean;
}

/**
 * Domain & Mailbox Warm-Up Scheduler implementing Part C rules.
 * Starts conservatively at 10 emails/day, ramping over 28 days to a maximum of 50 emails/day
 * with randomized 2–5 minute spacing between dispatches.
 */
export class WarmupScheduler {
  private warmupStartDate: Date;

  constructor(startDateStr?: string) {
    this.warmupStartDate = startDateStr ? new Date(startDateStr) : new Date();
  }

  public getWarmupState(): WarmupScheduleState {
    const msSinceStart = Math.max(0, Date.now() - this.warmupStartDate.getTime());
    const day = Math.floor(msSinceStart / (1000 * 60 * 60 * 24)) + 1;

    let dailyCap = 10;
    if (day <= 3) {
      dailyCap = 10; // Days 1-3: 10/day
    } else if (day <= 7) {
      dailyCap = 15; // Days 4-7: 15/day
    } else if (day <= 14) {
      dailyCap = 25; // Days 8-14: 25/day
    } else if (day <= 21) {
      dailyCap = 35; // Days 15-21: 35/day
    } else {
      dailyCap = 50; // Days 22+: 50/day conservative ceiling
    }

    return {
      currentDay: day,
      dailyCap,
      minDelaySeconds: 120, // 2 minutes
      maxDelaySeconds: 300, // 5 minutes
      isWarmupCompleted: day > 28,
    };
  }

  /**
   * Generates a randomized interval between 2 and 5 minutes (in milliseconds)
   */
  public getRandomizedDispatchIntervalMs(): number {
    const minMs = 120 * 1000;
    const maxMs = 300 * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  }
}

export const warmupScheduler = new WarmupScheduler();
