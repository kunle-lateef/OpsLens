'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

type OrgSwitcherProps = {
  organizationName: string;
  userName: string;
  avatarUrl?: string | null;
};

// Named OrgSwitcher to match architecture.md's directory layout, but there
// is no actual switching yet — User.organizationId in the current schema is
// a single FK, not a many-to-many membership, so one user belongs to
// exactly one organization. This becomes a real switcher only if that
// schema shape changes; confirm with the developer before building
// multi-org membership rather than assuming it from this component's name.
//
// Pinned to the bottom of the sidebar as a distinct "account panel" —
// avatar, org, user, sign-out, grounded in its own `--color-surface-elevated`
// container — rather than plain text sharing the top row with utility icons
// (notifications/theme moved out to SidebarHeader, which now owns the top).
// See the developer-approved sidebar redesign preview for the before/after.
export function OrgSwitcher({
  organizationName,
  userName,
  avatarUrl,
}: OrgSwitcherProps) {
  return (
    <div className="m-(--space-2) flex items-center gap-(--space-2) rounded-(--radius-md) bg-(--color-surface-elevated) p-(--space-2)">
      <Avatar name={userName} avatarUrl={avatarUrl} size={32} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          title={organizationName}
          className="truncate text-(--color-text-primary) [font:var(--font-label)]"
        >
          {organizationName}
        </span>
        <span
          title={userName}
          className="truncate text-(--color-text-tertiary) [font:var(--font-caption)]"
        >
          {userName}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Sign out"
        onClick={() => signOut({ callbackUrl: '/' })}
      >
        <LogOut size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
