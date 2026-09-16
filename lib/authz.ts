import { RoleName } from '@prisma/client';
import { getSession } from '@/lib/auth';

// Enforced at the server/service layer per security.md's Multi-Tenant
// Isolation section — every server action and route handler that touches
// organization-scoped data calls these, never trusting a nested route param
// alone to prove ownership.

export class UnauthenticatedError extends Error {}
export class ForbiddenError extends Error {}

/** Throws UnauthenticatedError if there's no valid session. */
export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new UnauthenticatedError('No valid session');
  }
  return session;
}

/**
 * Throws ForbiddenError if the session's organization doesn't match the
 * record's organizationId. Organization membership alone is necessary but
 * not sufficient for a write — pair with requireRole where the action needs more.
 */
export async function requireOrganization(organizationId: string) {
  const session = await requireSession();
  if (session.user.organizationId !== organizationId) {
    throw new ForbiddenError('Organization mismatch');
  }
  return session;
}

/** Role hierarchy for MVP, per db-migration-runner's Role model — fixed set, most to least privileged. */
const ROLE_RANK: Record<RoleName, number> = {
  [RoleName.Owner]: 4,
  [RoleName.Admin]: 3,
  [RoleName.Manager]: 2,
  [RoleName.Analyst]: 1,
  [RoleName.Viewer]: 0,
};

/**
 * Pure predicate version of the same rank check requireRole throws on —
 * exported so callers that already follow this codebase's `return
 * err(...)` convention (every server action in app/**\/actions.ts) can gate
 * a write without adopting a throw-based control flow this app doesn't
 * otherwise use. See security.md's Multi-Tenant Isolation section: "a
 * user's role is checked in addition to organization membership... not
 * sufficient for a write action" — found unenforced by any real action
 * during the Phase 7 security pass and fixed at the call sites using this.
 */
export function hasMinimumRole(role: RoleName, minimumRole: RoleName) {
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}

/** Throws ForbiddenError unless the session's role meets or exceeds the minimum required role. */
export async function requireRole(
  organizationId: string,
  minimumRole: RoleName,
) {
  const session = await requireOrganization(organizationId);
  if (!hasMinimumRole(session.user.roleName, minimumRole)) {
    throw new ForbiddenError(`Requires ${minimumRole} or higher`);
  }
  return session;
}
