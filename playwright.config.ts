import { defineConfig, devices } from '@playwright/test';

// E2E tests — see AGENTS.md's implementation plan, Phase 7 (Quality).
// tests/e2e/smoke.spec.ts needs no database or API key: it only exercises
// the public marketing/auth pages and the deny-by-default middleware, all
// of which work against placeholder env vars. tests/e2e/critical-journey.spec.ts
// covers the master spec's full critical journey (Section 68) and requires
// a real DATABASE_URL and ANTHROPIC_API_KEY — see that file's header for
// why it's structured to skip itself rather than fail when those aren't a
// real, migrated database.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start a server for local/CI runs that don't already point at one
  // (E2E_BASE_URL set) — e.g. a Vercel preview deployment.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
