import { z } from 'zod';

// An unset env var in .env/.env.local is "" once loaded, not undefined —
// .env.example itself ships UPSTASH_REDIS_REST_URL/TOKEN blank, so
// `.optional()` alone would only forgive a truly absent key, not the blank
// line most people actually leave. Treat "" as "not set" before it reaches
// the real validator, so the fallback path in lib/rate-limit.ts stays
// reachable for anyone following the setup instructions as written.
const optionalString = (validator: z.ZodTypeAny) =>
  z.preprocess((value) => (value === '' ? undefined : value), validator.optional());

// Boot-time environment validation — see security.md's Secrets and
// Configuration rules. If a required variable is missing, the app refuses
// to start rather than running in a half-configured state.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  // Optional: the production rate-limiter backing store (Upstash Redis via
  // the Vercel Marketplace integration — see security.md's Rate Limiting
  // section and lib/rate-limit.ts). Not required at boot — when unset,
  // lib/rate-limit.ts falls back to its in-memory limiter, which is the
  // intended behavior for local development.
  UPSTASH_REDIS_REST_URL: optionalString(z.string().url()),
  UPSTASH_REDIS_REST_TOKEN: optionalString(z.string().min(1)),
  // Local-dev-only escape hatch so the app is testable before a real
  // ANTHROPIC_API_KEY is available — see lib/ai/mock.ts for the actual
  // fixture logic and, critically, the hard NODE_ENV!=='production' gate
  // that keeps this from ever being reachable outside local development,
  // even if this were accidentally left set somewhere. Never set this in
  // Preview or Production — see security.md's AI Output & Structured Data
  // Trust section.
  AI_MOCK_MODE: optionalString(z.enum(['true', 'false'])),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  AI_MOCK_MODE: process.env.AI_MOCK_MODE,
});
