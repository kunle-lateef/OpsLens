// Prisma 6's config-file mode stops auto-loading .env once prisma.config.ts
// exists — this is Prisma's own documented fix, loading it explicitly so
// `npx prisma migrate dev`/`db seed` can still resolve env vars. Loads both
// files (.env.local overriding .env, matching Next.js's own precedence) so
// `prisma db seed` — which imports lib/env.ts transitively via
// lib/ai/client.ts — sees the same variables the running app does, not just
// DATABASE_URL/DIRECT_URL.
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });
import { defineConfig } from 'prisma/config';

export default defineConfig({
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
