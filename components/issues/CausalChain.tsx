import { ArrowDown } from '@/components/ui/icons';

export type CausalChainNode = {
  id: string;
  description: string;
};

type CausalChainProps = {
  /** Contributing factors in the order they were derived — see explain-root-cause.ts. */
  factors: CausalChainNode[];
  /** The Insight this chain ultimately explains — rendered as the final node. */
  outcome: string;
  className?: string;
};

/**
 * The only component that should render a root-cause contributing-factor
 * visualization — see design-system.md's CausalChain section. Directional
 * connectors, hedged language only. Each node is a real Evidence row (see
 * app/(dashboard)/issues/[issueId]/page.tsx, which passes the
 * `contributing_factor`-typed Evidence rows here) — this never renders a
 * factor that isn't traceable back to one.
 */
export function CausalChain({ factors, outcome, className }: CausalChainProps) {
  if (factors.length === 0) return null;

  return (
    <ol className={className}>
      {factors.map((factor) => (
        <li
          key={factor.id}
          className="flex flex-col items-start gap-(--space-1)"
        >
          <span className="rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-elevated) px-(--space-3) py-(--space-2) text-(--color-text-primary) [font:var(--font-body)]">
            {factor.description}
          </span>
          <ArrowDown
            aria-hidden="true"
            className="ml-(--space-3) h-4 w-4 text-(--color-text-tertiary)"
          />
        </li>
      ))}
      <li>
        <span className="rounded-(--radius-md) border border-(--color-brand-accent) bg-(--color-brand-tint-medium) px-(--space-3) py-(--space-2) text-(--color-text-primary) [font:var(--font-body-emphasis)]">
          {outcome}
        </span>
      </li>
    </ol>
  );
}
