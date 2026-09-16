'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

const SEVERITY_TOKEN: Record<(typeof SEVERITIES)[number], string> = {
  Critical: '--color-critical',
  High: '--color-high',
  Medium: '--color-medium',
  Low: '--color-neutral',
};

// Link-driven (not fetch-driven) filtering — the URL is the source of truth,
// so IssuesPage stays a server component that reads searchParams directly,
// per architecture.md's Rendering Rules preference for server rendering.
// This component only ever navigates; it never holds the filtered data.
export function FilterChips({ active }: { active: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setSeverity(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('severity', value);
    else params.delete('severity');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div
      role="group"
      aria-label="Filter issues by severity"
      className="flex flex-wrap gap-(--space-2)"
    >
      <Chip label="All" isActive={!active} onClick={() => setSeverity(null)} />
      {SEVERITIES.map((severity) => (
        <Chip
          key={severity}
          label={severity}
          token={SEVERITY_TOKEN[severity]}
          isActive={active === severity}
          onClick={() => setSeverity(severity)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  token,
  isActive,
  onClick,
}: {
  label: string;
  token?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-(--space-1) rounded-(--radius-full) border px-(--space-3) py-(--space-1) [font:var(--font-label)] focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none',
        isActive
          ? 'border-(--color-brand-accent) bg-(--color-brand-tint-selected) text-(--color-brand-accent)'
          : 'border-(--color-border-strong) bg-(--color-surface-elevated) text-(--color-text-secondary)',
      )}
    >
      {token && (
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-(--radius-full)"
          style={{ backgroundColor: `var(${token})` }}
        />
      )}
      {label}
    </button>
  );
}
