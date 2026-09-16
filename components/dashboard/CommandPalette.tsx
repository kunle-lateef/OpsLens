'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  AlertCircle,
  Building2,
  Clock,
  MessageSquare,
  FileText,
  SlidersHorizontal,
  Database,
  Search,
  type AppIcon,
} from '@/components/ui/icons';
import type { IssueSeverity } from '@prisma/client';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';

// Mirrors NavSidebar's enabled NAV_ITEMS exactly — see that file's comment
// on why disabled items (Intelligence, Settings) aren't linked yet. Kept as
// a separate list rather than importing NavSidebar's (unexported) one,
// since this needs icons re-paired with palette-specific keywords, not the
// nav's own rendering.
const PAGES: { label: string; href: string; icon: AppIcon }[] = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Issues', href: '/issues', icon: AlertCircle },
  { label: 'Departments', href: '/departments', icon: Building2 },
  { label: 'Timeline', href: '/timeline', icon: Clock },
  { label: 'AI Assistant', href: '/assistant', icon: MessageSquare },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Simulator', href: '/simulator', icon: SlidersHorizontal },
  { label: 'Data', href: '/data', icon: Database },
];

type IssueResult = { id: string; title: string; severity: IssueSeverity };

/**
 * ⌘K / Ctrl+K command palette — genuinely new, not a re-skin of anything
 * that existed before. cmdk supplies fuzzy filtering only; every rendered
 * row still uses OpsLens's own tokens and the real SeverityBadge component.
 * Mounted once in DashboardShell so it's reachable from any dashboard page.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<IssueResult[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open || issues !== null) return;
    fetch('/api/issues/search')
      .then((res) => (res.ok ? res.json() : { issues: [] }))
      .then((data) => setIssues(data.issues ?? []))
      .catch(() => setIssues([]));
  }, [open, issues]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-(--space-2) rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-elevated) px-(--space-3) py-(--space-1-5) text-(--color-text-tertiary) [font:var(--font-caption)] hover:border-(--color-border-strong) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none md:flex"
      >
        <Search size={13} aria-hidden="true" />
        Search
        <kbd className="ml-(--space-2) rounded-(--radius-sm) border border-(--color-border-subtle) bg-(--color-surface-base) px-(--space-1) text-(--color-text-tertiary)">
          ⌘K
        </kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        className="fixed top-[20%] left-1/2 z-50 w-full max-w-md -translate-x-1/2 overflow-hidden rounded-(--radius-lg) border border-(--color-border-strong) bg-(--color-surface-elevated) shadow-lg"
        shouldFilter
      >
        <div className="flex items-center gap-(--space-2) border-b border-(--color-border-subtle) px-(--space-3) py-(--space-2)">
          <Search
            size={14}
            aria-hidden="true"
            className="text-(--color-text-tertiary)"
          />
          <Command.Input
            placeholder="Jump to a page or issue..."
            className="w-full bg-transparent text-(--color-text-primary) [font:var(--font-body)] placeholder:text-(--color-text-tertiary) focus:outline-none"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-(--space-2)">
          <Command.Empty className="px-(--space-3) py-(--space-4) text-center text-(--color-text-tertiary) [font:var(--font-body)]">
            Nothing found.
          </Command.Empty>

          <Command.Group
            heading="Pages"
            className="px-(--space-2) py-(--space-1) text-(--color-text-tertiary) [&_[cmdk-group-heading]]:mb-(--space-1) [&_[cmdk-group-heading]]:[font:var(--font-overline-semi-bold)] [&_[cmdk-group-heading]]:uppercase"
          >
            {PAGES.map(({ label, href, icon: Icon }) => (
              <Command.Item
                key={href}
                value={label}
                onSelect={() => go(href)}
                className={cn(
                  'flex cursor-pointer items-center gap-(--space-2) rounded-(--radius-sm) px-(--space-2) py-(--space-2) text-(--color-text-primary) [font:var(--font-body)]',
                  'data-[selected=true]:bg-(--color-brand-tint-medium) data-[selected=true]:text-(--color-brand-accent)',
                )}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </Command.Item>
            ))}
          </Command.Group>

          {issues && issues.length > 0 && (
            <Command.Group
              heading="Issues"
              className="mt-(--space-2) px-(--space-2) py-(--space-1) text-(--color-text-tertiary) [&_[cmdk-group-heading]]:mb-(--space-1) [&_[cmdk-group-heading]]:[font:var(--font-overline-semi-bold)] [&_[cmdk-group-heading]]:uppercase"
            >
              {issues.map((issue) => (
                <Command.Item
                  key={issue.id}
                  value={issue.title}
                  onSelect={() => go(`/issues/${issue.id}`)}
                  className={cn(
                    'flex cursor-pointer items-center gap-(--space-2) rounded-(--radius-sm) px-(--space-2) py-(--space-2) [font:var(--font-body)]',
                    'data-[selected=true]:bg-(--color-brand-tint-medium)',
                  )}
                >
                  <SeverityBadge severity={issue.severity} />
                  <span className="truncate text-(--color-text-primary)">
                    {issue.title}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
