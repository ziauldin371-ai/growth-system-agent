import crypto from 'crypto';

interface AttemptRecord {
  count: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export class LoginGuard {
  private getKey(ip: string, email: string): string {
    return `${ip}:${email.toLowerCase().trim()}`;
  }

  public isLocked(ip: string, email: string): { locked: boolean; retryAfterSeconds?: number } {
    const key = this.getKey(ip, email);
    const record = loginAttempts.get(key);

    if (!record) return { locked: false };

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { locked: true, retryAfterSeconds: remainingSeconds };
    }

    if (record.lockedUntil && record.lockedUntil <= now) {
      // Lockout expired; reset counter
      loginAttempts.delete(key);
      return { locked: false };
    }

    return { locked: false };
  }

  public recordFailedAttempt(ip: string, email: string): { remainingAttempts: number; isLockedNow: boolean } {
    const key = this.getKey(ip, email);
    const record = loginAttempts.get(key) || { count: 0 };
    record.count += 1;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_WINDOW_MS;
      loginAttempts.set(key, record);
      return { remainingAttempts: 0, isLockedNow: true };
    }

    loginAttempts.set(key, record);
    return { remainingAttempts: MAX_ATTEMPTS - record.count, isLockedNow: false };
  }

  public resetAttempts(ip: string, email: string): void {
    const key = this.getKey(ip, email);
    loginAttempts.delete(key);
  }

  /**
   * Constant-time string comparison to prevent timing attacks on passwords and secrets.
   */
  public constantTimeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
      // Execute timingSafeEqual against bufA to maintain constant execution time
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  }
}

export const loginGuard = new LoginGuard();

