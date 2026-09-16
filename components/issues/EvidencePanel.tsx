'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export type EvidenceItem = {
  id: string;
  sourceType: string;
  description: string;
  metricValue: number | null;
  comparisonValue: number | null;
  period: string | null;
};

type EvidencePanelProps = {
  evidence: EvidenceItem[];
  className?: string;
};

/**
 * The only component that should render the supporting evidence behind an
 * Insight, root-cause explanation, or Recommendation — see
 * design-system.md's EvidencePanel section and component-builder/SKILL.md's
 * Trust-Model-Aware Components: evidence is never optional or hidden behind
 * a hover. Starts expanded by default (the stricter of the two documented
 * options — "visible in the default state, or reachable with exactly one
 * click"); the collapse toggle is for managing density on a page with many
 * evidence items, not for hiding evidence's existence.
 */
export function EvidencePanel({ evidence, className }: EvidencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (evidence.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-elevated)',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between p-(--space-3) text-(--color-text-primary) [font:var(--font-h3)] focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
        aria-expanded={isExpanded}
      >
        Evidence ({evidence.length})
        {isExpanded ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <ul className="flex flex-col gap-(--space-2) border-t border-(--color-border-subtle) p-(--space-3)">
          {evidence.map((item) => (
            <li key={item.id} className="flex flex-col gap-(--space-0-5)">
              <span className="text-(--color-text-primary) [font:var(--font-body)]">
                {item.description}
              </span>
              <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                {item.sourceType}
                {item.period ? ` · ${item.period}` : ''}
                {item.metricValue !== null
                  ? ` · value: ${item.metricValue}`
                  : ''}
                {item.comparisonValue !== null
                  ? ` · baseline: ${item.comparisonValue}`
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
