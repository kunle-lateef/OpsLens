'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from '@/components/ui/icons';
import type { Notification } from '@prisma/client';
import { OrgSwitcher } from '@/components/dashboard/OrgSwitcher';
import { SidebarHeader } from '@/components/dashboard/SidebarHeader';
import { NavSidebar } from '@/components/dashboard/NavSidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { CommandPalette } from '@/components/dashboard/CommandPalette';

type DashboardShellProps = {
  organizationName: string;
  userName: string;
  avatarUrl?: string | null;
  notifications: Notification[];
  unreadNotificationCount: number;
  children: React.ReactNode;
};

// The persistent w-56 sidebar (still exactly as before, md and up) has no
// room to coexist with real content below that width — a real Playwright
// check at 375px found genuine horizontal overflow, since the sidebar
// previously had no responsive behavior at all. Below md, it collapses into
// a top bar plus a slide-out drawer holding the same OrgSwitcher +
// NavSidebar content, rather than a second, divergent mobile nav to keep in
// sync.
export function DashboardShell({
  organizationName,
  userName,
  avatarUrl,
  notifications,
  unreadNotificationCount,
  children,
}: DashboardShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Close the drawer on navigation — otherwise it stays open behind the
  // next page after tapping a nav link. Adjusting state during render
  // (React's documented pattern for "reset state when a prop changes")
  // rather than in an effect, which would cause an extra visible render
  // where the new page briefly shows behind the still-open drawer.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsDrawerOpen(false);
  }

  useEffect(() => {
    if (!isDrawerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsDrawerOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Header + nav at the top, account panel pinned to the bottom — NavSidebar
  // already carries flex-1 (see its own className), so it fills the gap
  // between them and pushes OrgSwitcher down regardless of how many nav
  // items exist. SidebarHeader is just the logo now — notifications/theme
  // live in the top-right bar below (desktop) or the mobile bar above
  // (mobile), never duplicated into the sidebar itself.
  const sidebarContent = (
    <>
      <SidebarHeader />
      <NavSidebar />
      <OrgSwitcher
        organizationName={organizationName}
        userName={userName}
        avatarUrl={avatarUrl}
      />
    </>
  );

  return (
    // Locked to exactly the viewport height, with the shell itself never
    // scrolling — sidebar, both headers, and the mobile drawer all stay
    // fixed in place; only <main> (and NavSidebar's own nav list, if it
    // ever outgrows a short viewport) scroll internally. Previously this
    // was min-h-screen, so a tall page scrolled the whole document,
    // carrying the sidebar and header away with it.
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center border-b border-(--color-border-subtle) px-(--space-2) py-(--space-2) md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center justify-center rounded-(--radius-sm) p-(--space-2) text-(--color-text-primary) hover:bg-(--color-surface-elevated) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <span aria-hidden="true" />
        <div className="flex items-center gap-(--space-1) justify-self-end">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotificationCount}
          />
          <ThemeToggle />
        </div>
      </div>

      <div className="hidden w-56 shrink-0 flex-col border-r border-(--color-border-subtle) md:flex">
        {sidebarContent}
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-(--color-overlay)"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative flex h-full w-64 max-w-[80vw] flex-col bg-(--color-surface-base)"
          >
            <div className="flex items-center justify-end px-(--space-2) py-(--space-2)">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center justify-center rounded-(--radius-sm) p-(--space-2) text-(--color-text-primary) hover:bg-(--color-surface-elevated) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Notifications + theme live here on desktop, above every page's own
          content — never duplicated in the sidebar itself. Hidden below
          md since the mobile top bar above already carries both. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hidden shrink-0 items-center justify-end gap-(--space-2) border-b border-(--color-border-subtle) px-(--space-6) py-(--space-2) md:flex">
          <CommandPalette />
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotificationCount}
          />
          <ThemeToggle />
        </div>
        <main className="flex-1 overflow-y-auto p-(--space-6)">{children}</main>
      </div>
    </div>
  );
}
