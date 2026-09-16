import '@testing-library/jest-dom/vitest';

// Fallback-only placeholders so importing any module that transitively
// touches lib/env.ts (which validates and throws at import time — see
// security.md's Secrets and Configuration section) doesn't crash test
// collection when running locally without a .env file. Only fills in a
// variable that's genuinely unset — a real CI/local environment with real
// credentials (e.g. for lib/ai/evaluation.test.ts's live-Claude checks)
// is never overridden. The "placeholder" substring is deliberate: it's
// what evaluation.test.ts's own skip guard checks for to decide whether
// live-credential tests should run or skip.
process.env.DATABASE_URL ??=
  'postgresql://user:pass@localhost:5432/placeholder';
process.env.ANTHROPIC_API_KEY ??= 'placeholder-for-tests';
process.env.AUTH_SECRET ??= 'placeholder-secret-for-tests';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
process.env.BLOB_READ_WRITE_TOKEN ??= 'placeholder-for-tests';
