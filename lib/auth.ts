import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';

// Wraps Auth.js per architecture.md's Authentication section. `getSession`
// is the name that section documents for server components/actions to call;
// `auth` is Auth.js's own name for the same function, re-exported as an
// alias so both spellings resolve to one implementation. The Credentials
// provider (and the Node crypto it needs via lib/password.ts) lives only
// here, not in lib/auth.config.ts — see that file for why.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string'
            ? credentials.email
            : undefined;
        const password =
          typeof credentials?.password === 'string'
            ? credentials.password
            : undefined;
        if (!email || !password) return null;

        // Rate-limited unconditionally per security.md's Rate Limiting section
        // ("Login and signup, to slow down credential stuffing").
        const limit = await rateLimit(
          `login:${email.toLowerCase()}`,
          10,
          60_000,
        );
        if (!limit.allowed) return null;

        const user = await db.user.findUnique({
          where: { email },
          include: { role: true },
        });
        if (!user) return null;

        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: user.organizationId,
          roleId: user.roleId,
          roleName: user.role.name,
        };
      },
    }),
  ],
});

export const getSession = auth;
