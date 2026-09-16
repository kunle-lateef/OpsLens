import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

// In-memory limiter for local development, per security.md's Rate Limiting
// section. Every serverless instance has its own Map, and it resets on
// redeploy — acceptable for a single developer's machine, not for
// production, which is why the Upstash-backed limiter below takes over
// whenever its env vars are configured.
const buckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

// Production backing store: Upstash Redis via the Vercel Marketplace
// integration (developer-confirmed choice, Phase 7 quality pass — see
// security.md's Rate Limiting section). Upstash's client is HTTP-based, so
// it works from serverless and Edge functions without a persistent
// connection. One Ratelimit instance per distinct (limit, windowMs) pair,
// cached so repeated calls with the same config reuse it rather than
// reconstructing on every request.
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const configKey = `${limit}:${windowMs}`;
  const existing = limiters.get(configKey);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    // Every caller passes its own descriptive prefix (e.g. `signup:`,
    // `assistant:`) as part of `key` already — this is Upstash's own
    // namespacing on top of that, kept short since it's stored in every key.
    prefix: 'opslens',
  });
  limiters.set(configKey, limiter);
  return limiter;
}

/**
 * Rate-limits a caller-defined key (e.g. `signup:${ip}`,
 * `assistant:${organizationId}:${userId}`) to `limit` calls per `windowMs`.
 * Async because the production path is a real network call to Redis — see
 * security.md's Rate Limiting section for which surfaces must call this.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!redis) {
    return inMemoryRateLimit(key, limit, windowMs);
  }

  const limiter = getLimiter(limit, windowMs);
  const result = await limiter.limit(key);
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}
