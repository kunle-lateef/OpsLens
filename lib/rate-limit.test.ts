import { describe, expect, it, vi, afterEach } from 'vitest';
import { rateLimit } from './rate-limit';

// No UPSTASH_REDIS_REST_URL/TOKEN are set in the test env (see
// vitest.setup.ts), so these exercise the in-memory fallback path — the
// same path local development uses. The Upstash-backed path is a thin
// wrapper around a well-tested third-party client and isn't re-verified
// here; see lib/rate-limit.ts's module-level comment for why the split
// exists.
afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimit', () => {
  it('allows requests up to the limit', async () => {
    const key = `test-${Math.random()}`;
    expect((await rateLimit(key, 3, 60_000)).allowed).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).allowed).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).allowed).toBe(true);
  });

  it('blocks requests once the limit is exceeded', async () => {
    const key = `test-${Math.random()}`;
    await rateLimit(key, 2, 60_000);
    await rateLimit(key, 2, 60_000);
    const third = await rateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('tracks separate keys independently', async () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    await rateLimit(keyA, 1, 60_000);
    const blockedA = await rateLimit(keyA, 1, 60_000);
    const allowedB = await rateLimit(keyB, 1, 60_000);
    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });

  it('resets the bucket once the window has elapsed', async () => {
    vi.useFakeTimers();
    const key = `reset-${Math.random()}`;
    await rateLimit(key, 1, 1_000);
    expect((await rateLimit(key, 1, 1_000)).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect((await rateLimit(key, 1, 1_000)).allowed).toBe(true);
  });

  it('decrements remaining on each allowed call', async () => {
    const key = `remaining-${Math.random()}`;
    expect((await rateLimit(key, 5, 60_000)).remaining).toBe(4);
    expect((await rateLimit(key, 5, 60_000)).remaining).toBe(3);
  });
});
