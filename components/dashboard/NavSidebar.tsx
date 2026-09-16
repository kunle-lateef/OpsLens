'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertCircle,
  Sparkles,
  Building2,
  Clock,
  MessageSquare,
  FileText,
  Database,
  Settings,
  SlidersHorizontal,
} from '@/components/ui/icons';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';

// Primary navigation, organized around user intent per design-system.md's
// Information Architecture — not one item per database entity. Only
// Overview has a real page so far (Foundation phase); the rest are
// deliberately disabled rather than linking to a 404, so the shell stays
// honest about what's actually built.
const NAV_ITEMS = [
  {
    label: 'Overview',
    href: '/overview',
    icon: LayoutDashboard,
    enabled: true,
  },
  { label: 'Issues', href: '/issues', icon: AlertCircle, enabled: true },
  {
    label: 'Intelligence',
    href: '/intelligence',
    icon: Sparkles,
    enabled: false,
  },
  {
    label: 'Departments',
    href: '/departments',
    icon: Building2,
    enabled: true,
  },
  { label: 'Timeline', href: '/timeline', icon: Clock, enabled: true },
  {
    label: 'AI Assistant',
    href: '/assistant',
    icon: MessageSquare,
    enabled: true,
  },
  { label: 'Reports', href: '/reports', icon: FileText, enabled: true },
  {
    label: 'Simulator',
    href: '/simulator',
    icon: SlidersHorizontal,
    enabled: true,
  },
  { label: 'Data', href: '/data', icon: Database, enabled: true },
  { label: 'Settings', href: '/settings', icon: Settings, enabled: false },
] as const;

export function NavSidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label="Primary"
        className="flex flex-1 flex-col gap-(--space-1) overflow-y-auto p-(--space-4)"
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon, enabled }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);

          return enabled ? (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-(--space-2) rounded-(--radius-sm) px-(--space-3) py-(--space-2) text-(--color-text-primary) [font:var(--font-label)]',
                'hover:bg-(--color-surface-elevated) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none',
                isActive &&
                  'bg-(--color-brand-tint-medium) text-(--color-brand-accent)',
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          ) : (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  aria-disabled="true"
                  className="flex items-center gap-(--space-2) rounded-(--radius-sm) px-(--space-3) py-(--space-2) text-(--color-disabled) [font:var(--font-label)] focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">Coming soon</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
