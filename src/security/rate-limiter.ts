export type RateLimitDecision =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number };

export interface RateLimiter {
  check(key: string, now?: number): RateLimitDecision;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Bounded single-process limiter used for local development/single-node operation. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxBuckets = 10_000,
  ) {
    if (!Number.isInteger(limit) || limit <= 0) throw new Error('RATE_LIMIT_INVALID_LIMIT');
    if (!Number.isInteger(windowMs) || windowMs <= 0) throw new Error('RATE_LIMIT_INVALID_WINDOW');
    if (!Number.isInteger(maxBuckets) || maxBuckets <= 0) throw new Error('RATE_LIMIT_INVALID_BUCKET_CAP');
  }

  check(key: string, now = Date.now()): RateLimitDecision {
    const normalized = key.trim();
    if (!normalized) throw new Error('RATE_LIMIT_KEY_REQUIRED');

    const current = this.buckets.get(normalized);
    if (!current || current.resetAt <= now) {
      const bucket = { count: 1, resetAt: now + this.windowMs };
      this.buckets.set(normalized, bucket);
      this.evictIfNeeded();
      return { allowed: true, remaining: this.limit - 1, resetAt: bucket.resetAt };
    }

    if (current.count >= this.limit) {
      return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    return { allowed: true, remaining: this.limit - current.count, resetAt: current.resetAt };
  }

  private evictIfNeeded(): void {
    if (this.buckets.size <= this.maxBuckets) return;
    const oldest = this.buckets.keys().next().value;
    if (oldest) this.buckets.delete(oldest);
  }
}
