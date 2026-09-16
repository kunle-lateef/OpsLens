import { SeverityBadge } from '@/components/ui/SeverityBadge';

const SEVERITY_LABELS = new Set([
  'Critical',
  'High',
  'Medium',
  'Low',
  'Informational',
]);

type ChainEvent = {
  id: string;
  type: string;
  timestamp: Date;
  severity: string | null;
};

// A chain is grouped by a real, shared foreign key (OperationalEvent.
// groupKey — see db-migration-runner/SKILL.md's note on that field), never
// by time proximity. The label below states that shared fact plainly
// ("Related to Order #4821") rather than in hedged language — unlike
// CausalChain, this isn't an AI inference, it's a verifiable database fact,
// so it doesn't need "likely"/"contributing factor" framing. Deliberately
// not styled with the Categorical palette, which design-system.md reserves
// for Health Score components and department accents.
export function EventChain({
  label,
  events,
}: {
  label: string;
  events: ChainEvent[];
}) {
  const ordered = [...events].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  return (
    <div className="flex flex-col gap-(--space-2) rounded-(--radius-md) border border-dashed border-(--color-border-strong) p-(--space-4)">
      <span className="text-(--color-brand-accent) [font:var(--font-label)]">
        Related to {label}
      </span>
      <div className="flex flex-col">
        {ordered.map((event, index) => (
          <div key={event.id} className="flex gap-(--space-3)">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className="mt-(--space-1) h-2 w-2 shrink-0 rounded-(--radius-full) border-2 border-(--color-brand-accent) bg-(--color-surface-base)"
              />
              {index < ordered.length - 1 && (
                <span
                  aria-hidden="true"
                  className="w-px flex-1 bg-(--color-border-strong)"
                />
              )}
            </div>
            <div className="flex flex-1 items-center gap-(--space-2) pb-(--space-3)">
              <span className="text-(--color-text-tertiary) tabular-nums [font:var(--font-caption)]">
                {event.timestamp.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {event.severity && SEVERITY_LABELS.has(event.severity) && (
                <SeverityBadge
                  severity={
                    event.severity as
                      'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
                  }
                />
              )}
              <span className="text-(--color-text-primary) [font:var(--font-body)]">
                {event.type.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
