import { describe, expect, it, vi } from 'vitest';
import { RoleName } from '@prisma/client';

const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

const {
  requireSession,
  requireOrganization,
  requireRole,
  hasMinimumRole,
  UnauthenticatedError,
  ForbiddenError,
} = await import('./authz');

function sessionFor(organizationId: string, roleName: RoleName) {
  return { user: { id: 'user-1', organizationId, roleId: 'role-1', roleName } };
}

describe('requireSession', () => {
  it('throws UnauthenticatedError when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    await expect(requireSession()).rejects.toThrow(UnauthenticatedError);
  });

  it('returns the session when one exists', async () => {
    const session = sessionFor('org-1', RoleName.Owner);
    mockGetSession.mockResolvedValueOnce(session);
    await expect(requireSession()).resolves.toEqual(session);
  });
});

describe('requireOrganization', () => {
  it("throws ForbiddenError when the session's organization does not match", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFor('org-1', RoleName.Owner));
    await expect(requireOrganization('org-2')).rejects.toThrow(ForbiddenError);
  });

  it('does not throw when the organization matches', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFor('org-1', RoleName.Owner));
    await expect(requireOrganization('org-1')).resolves.toBeDefined();
  });
});

describe('requireRole', () => {
  it('allows a role at or above the minimum', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFor('org-1', RoleName.Admin));
    await expect(requireRole('org-1', RoleName.Manager)).resolves.toBeDefined();
  });

  it('throws ForbiddenError for a role below the minimum', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFor('org-1', RoleName.Viewer));
    await expect(requireRole('org-1', RoleName.Manager)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("throws ForbiddenError before checking role if the organization doesn't match", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFor('org-1', RoleName.Owner));
    await expect(requireRole('org-2', RoleName.Viewer)).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe('hasMinimumRole', () => {
  it('returns true when the role meets the minimum', () => {
    expect(hasMinimumRole(RoleName.Manager, RoleName.Analyst)).toBe(true);
  });

  it('returns true when the role exactly equals the minimum', () => {
    expect(hasMinimumRole(RoleName.Analyst, RoleName.Analyst)).toBe(true);
  });

  it('returns false when the role is below the minimum', () => {
    expect(hasMinimumRole(RoleName.Viewer, RoleName.Analyst)).toBe(false);
  });
});
