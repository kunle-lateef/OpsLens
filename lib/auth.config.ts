import type { NextAuthConfig } from 'next-auth';

// The Edge-compatible subset of the Auth.js config — no providers here.
// middleware.ts runs in the Edge Runtime, which doesn't support Node's
// crypto module that the Credentials provider needs (via lib/password.ts).
// lib/auth.ts extends this with the actual provider for everywhere else.
export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  // Auth.js only auto-trusts the incoming Host header when it detects a
  // Vercel deployment (the VERCEL env var) — anywhere else, including local
  // `next dev`/`next start` and this app's own Playwright E2E run (see
  // tests/e2e/smoke.spec.ts), every session check throws "UntrustedHost"
  // without this. Found by actually running the E2E smoke suite during the
  // Phase 7 quality pass, not by inspection — explicit here rather than
  // relying on environment-dependent auto-detection, matching this file's
  // own stated preference for documented intent over implicit behavior.
  trustHost: true,
  // No providers here — this config is only ever used with NextAuth's
  // `.auth` session-check helper (middleware/proxy), never to actually sign
  // someone in. lib/auth.ts adds the real provider for everywhere else.
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.organizationId = user.organizationId;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.organizationId = token.organizationId;
      session.user.roleId = token.roleId;
      session.user.roleName = token.roleName;
      return session;
    },
  },
  // Explicit per security.md's Authentication section, even though these
  // largely match Auth.js's own defaults — documented intent, not implicit behavior.
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
} satisfies NextAuthConfig;
