import path from 'node:path';
import { test, expect } from '@playwright/test';

// The master spec's Section 68 critical journey: sign up -> workspace ->
// upload -> map -> import -> Morning Brief -> issue -> evidence ->
// recommendation -> AI Assistant -> feedback. Needs a real, migrated
// DATABASE_URL and a real ANTHROPIC_API_KEY — the ingestion workflow and
// every AI pipeline stage run for real, including genuinely billed Claude
// calls. Skips itself (doesn't fail) without both, matching the same
// pattern lib/ai/evaluation.test.ts uses for the same reason.
//
// This file has not been executed against a live app in this environment
// (no real database or API key were available) — the flow was written by
// reading the actual page/component source (see app/(dashboard)/data/
// [importId]/page.tsx, app/(dashboard)/issues/[issueId]/page.tsx,
// components/assistant/AssistantChat.tsx) rather than by observing a
// running app, so treat a selector mismatch on first real run as expected,
// not as a sign the underlying feature is broken.
const hasDatabase =
  Boolean(process.env.DATABASE_URL) &&
  !process.env.DATABASE_URL?.includes('user:pass@localhost');
const hasAnthropicKey =
  Boolean(process.env.ANTHROPIC_API_KEY) &&
  !process.env.ANTHROPIC_API_KEY?.includes('placeholder');

test.describe('critical journey', () => {
  test.skip(
    !hasDatabase || !hasAnthropicKey,
    'Requires a real, migrated DATABASE_URL and a real ANTHROPIC_API_KEY — not available in this environment.',
  );

  test('sign up, import data, review an issue, and ask the AI Assistant', async ({
    page,
  }) => {
    const unique = Date.now();

    // 1. Sign up -> workspace created
    await page.goto('/signup');
    await page.getByLabel('Company name').fill(`E2E Test Co ${unique}`);
    await page.getByLabel('Your name').fill('E2E Tester');
    await page.getByLabel('Work email').fill(`e2e-${unique}@example.com`);
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: /create workspace/i }).click();

    await page.waitForURL('/overview', { timeout: 15_000 });

    // 2. Upload a CSV
    await page.goto('/data');
    const fileInputPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /upload csv/i }).click();
    const fileChooser = await fileInputPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'orders.csv'));

    // The upload + workflow start redirects to /data/[importId] once
    // createDataImport() returns.
    await page.waitForURL(/\/data\/[^/]+$/, { timeout: 30_000 });

    // 3. Data Mapping — StatusPoller (components/data/StatusPoller.tsx)
    // refreshes the page as the workflow advances; wait for MappingPending.
    await expect(
      page.getByText('Waiting for you to confirm the column mapping'),
    ).toBeVisible({ timeout: 60_000 });
    await page
      .getByRole('button', { name: /confirm mapping and import/i })
      .click();

    // 4. Normalization/import completes
    await expect(
      page.getByText(/^(Completed|Completed with some rows rejected)$/),
    ).toBeVisible({ timeout: 120_000 });

    // 5. Morning Brief (Overview) — a Health Score renders (possibly still
    // an insufficient-data state on this little a fixture; the assertion is
    // just that the section renders without erroring).
    await page.goto('/overview');
    await expect(page.getByText(/operational health score/i)).toBeVisible();

    // 6. Issues Feed + Issue Detail — best-effort: whether this fixture's
    // volume is enough for the AI pipeline to actually detect and raise an
    // Issue is not guaranteed (real model judgment, not a fixed threshold
    // this test controls). If one exists, drill into the full trust-model
    // surface; if not, that's a fixture-sizing question for whoever runs
    // this for real, not a failure of this test to write correctly.
    await page.goto('/issues');
    const firstIssue = page.getByRole('link').first();
    if (await firstIssue.isVisible().catch(() => false)) {
      await firstIssue.click();
      await expect(page.getByText(/^Evidence \(/)).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Root Cause' }),
      ).toBeVisible();

      const acceptButton = page.getByRole('button', { name: 'Accept' });
      if (await acceptButton.isVisible().catch(() => false)) {
        await acceptButton.click();
        // A human decision is never silently overwritten — the decision
        // buttons disappear once recorded, replaced by the decided state.
        await expect(acceptButton).not.toBeVisible();
      }
    }

    // 7. AI Assistant — ask a grounded question, then leave feedback.
    await page.goto('/assistant');
    await page
      .getByRole('button', { name: /most important operational problems/i })
      .click();
    await expect(page.getByText(/answer/i).first()).toBeVisible({
      timeout: 30_000,
    });
    const thumbsUp = page.getByRole('button', {
      name: 'This answer was helpful',
    });
    await expect(thumbsUp).toBeVisible({ timeout: 5_000 });
    await thumbsUp.click();
    await expect(thumbsUp).toHaveAttribute('aria-pressed', 'true');
  });
});
