/**
 * Tiny fixed-window, in-memory rate limiter.
 *
 * MVP limitation: state lives in each server instance's memory, so on
 * serverless hosting (Vercel) limits are per-instance and reset on cold
 * starts. It stops casual abuse, not a determined attacker. The durable
 * per-session AI limit is enforced in the database (claim_generation).
 */
interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now: number = Date.now(),
): RateLimitResult {
  if (buckets.size > MAX_KEYS) {
    for (const [k, w] of buckets) if (w.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}
