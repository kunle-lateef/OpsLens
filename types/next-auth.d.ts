import type { DefaultSession } from 'next-auth';
import type { RoleName } from '@prisma/client';

// Module augmentation so session.user carries organizationId/roleId with
// real types end to end — see code-style.md's "Do not use any" rule.
//
// next-auth's own "next-auth" and "next-auth/jwt" modules just re-export
// these interfaces from @auth/core — TypeScript's `declare module` merges
// only apply at the module where an interface is originally declared, so
// the augmentation targets @auth/core directly, not the re-export barrel.
declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      roleId: string;
      roleName: RoleName;
    } & DefaultSession['user'];
  }

  interface User {
    organizationId: string;
    roleId: string;
    roleName: RoleName;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    organizationId: string;
    roleId: string;
    roleName: RoleName;
  }
}
