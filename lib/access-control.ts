// Deny-by-default: everything not explicitly listed here requires a
// session — see security.md's "no unauthenticated boundary to any
// organization's data or business logic." An allow-list of *protected*
// paths was tried first and rejected: every new route added in a later
// phase would need someone to remember to add it there, or it ships
// unprotected with no warning. Flipping the default means a forgotten route
// is protected, not exposed. Individual server actions/route handlers still
// re-check organizationId explicitly (see lib/authz.ts) since middleware
// alone is never sufficient for tenant isolation.
//
// This module is deliberately framework-free (no `next/server`, no
// `next-auth`) so the actual trust-boundary decision tree can be unit
// tested directly under plain Vitest — `next/server` does not resolve
// outside Next's own bundler, which made middleware.ts itself untestable.
// middleware.ts imports this and translates the plain result into a real
// NextResponse.
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
]);

// Also public, but — unlike the logged-out-only pages above — never
// redirected away from when already signed in: a signed-in user might
// reasonably open the privacy policy or terms from inside the app, not
// just before creating an account.
const ALWAYS_ACCESSIBLE_PATHS = new Set(['/privacy', '/terms']);

export function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    ALWAYS_ACCESSIBLE_PATHS.has(pathname) ||
    pathname.startsWith('/api/auth') ||
    // The Workflow SDK's own internal callback path — see the Workflow
    // Development Kit's Next.js guide. Vercel calls this unauthenticated;
    // it must never be redirected to /login or blocked by our own auth.
    pathname.startsWith('/.well-known/workflow')
  );
}

export type AccessDecision =
  | { type: 'next' }
  | { type: 'redirect'; url: string }
  | { type: 'json'; status: number; body: unknown };

export function decideAccess(
  pathname: string,
  isAuthenticated: boolean,
  origin: string,
): AccessDecision {
  if (isPublicPath(pathname)) {
    // An already-authenticated user hitting `/`, `/login`, or `/signup`
    // gets sent to their workspace instead of the logged-out experience —
    // but not for ALWAYS_ACCESSIBLE_PATHS, which stay open either way.
    if (
      isAuthenticated &&
      !pathname.startsWith('/api/') &&
      !ALWAYS_ACCESSIBLE_PATHS.has(pathname)
    ) {
      return { type: 'redirect', url: new URL('/overview', origin).toString() };
    }
    return { type: 'next' };
  }

  if (isAuthenticated) {
    return { type: 'next' };
  }

  // An unauthenticated API call gets a 401 JSON envelope, matching
  // architecture.md's error envelope — not a redirect to an HTML login
  // page, which is the wrong response shape for a fetch() caller.
  if (pathname.startsWith('/api/')) {
    return {
      type: 'json',
      status: 401,
      body: {
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' },
      },
    };
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('callbackUrl', pathname);
  return { type: 'redirect', url: loginUrl.toString() };
}
