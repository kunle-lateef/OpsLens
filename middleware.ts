import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';
import { decideAccess } from '@/lib/access-control';

// Uses the Edge-compatible config directly (no Credentials provider) since
// middleware runs in the Edge Runtime — see lib/auth.config.ts. The actual
// deny-by-default decision tree lives in lib/access-control.ts (pure, unit
// tested); this file only translates that decision into a NextResponse.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const decision = decideAccess(
    req.nextUrl.pathname,
    Boolean(req.auth),
    req.nextUrl.origin,
  );

  switch (decision.type) {
    case 'next':
      return NextResponse.next();
    case 'redirect':
      return NextResponse.redirect(decision.url);
    case 'json':
      return NextResponse.json(decision.body, { status: decision.status });
  }
});

export const config = {
  // Run on everything except Next's own internals and static files —
  // decideAccess decides public vs protected, not this matcher. `logo/` was
  // added after a real bug: BrandMark's <img src="/logo/...svg"> requests
  // were falling through to decideAccess, which correctly treats an
  // unrecognized path as protected and redirected them to /login — breaking
  // the logo on /login and /signup themselves, the two pages that most need
  // a public static asset to just load. Static assets belong in this
  // matcher exclusion (next to favicon.ico/icon.svg), not in
  // isPublicPath's allow-list, which is for app routes, not files. `marketing/`
  // was added for the same reason once the marketing page started
  // referencing a real /marketing/*.png screenshot directly.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|logo/|marketing/).*)',
  ],
};
