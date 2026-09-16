import { test, expect } from '@playwright/test';

// Runs against placeholder env vars — no real DATABASE_URL or
// ANTHROPIC_API_KEY needed. These checks only exercise the public
// marketing/auth pages and the deny-by-default middleware (lib/access-
// control.ts), none of which touch the database for an unauthenticated
// request. See critical-journey.spec.ts for the full authenticated flow,
// which does need real credentials.
test.describe('public pages', () => {
  test('marketing page loads and links to sign-up', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: /create your workspace/i }),
    ).toBeVisible();
  });

  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('signup page renders the workspace-creation form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel('Company name')).toBeVisible();
    await expect(page.getByLabel('Work email')).toBeVisible();
  });
});

test.describe('deny-by-default middleware (lib/access-control.ts)', () => {
  test('an unauthenticated request for a protected page is redirected to /login with a callbackUrl', async ({
    page,
  }) => {
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Foverview/);
  });

  test('a route added without updating isPublicPath is still protected', async ({
    page,
  }) => {
    // Proves the deny-by-default direction empirically, not just via the
    // unit test on isPublicPath — a path nobody registered still redirects,
    // it does not 404 through to an unauthenticated render.
    await page.goto('/some-route-nobody-registered');
    await expect(page).toHaveURL(/\/login/);
  });

  test('an unauthenticated protected API call gets a 401 JSON envelope, not a redirect', async ({
    request,
  }) => {
    const response = await request.post('/api/uploads', { data: {} });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toEqual({
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' },
    });
  });
});
