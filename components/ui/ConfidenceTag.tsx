import { cn } from '@/lib/cn';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'InsufficientEvidence';

const CONFIDENCE_CONFIG: Record<
  ConfidenceLevel,
  { token: string; label: string }
> = {
  High: { token: '--color-confidence-high', label: 'High confidence' },
  Medium: { token: '--color-confidence-medium', label: 'Medium confidence' },
  Low: { token: '--color-confidence-low', label: 'Low confidence' },
  InsufficientEvidence: {
    token: '--color-confidence-insufficient',
    label: 'Insufficient evidence',
  },
};

const CONFIDENCE_TEXT: Record<ConfidenceLevel, string> = {
  High: 'High confidence',
  Medium: 'Medium confidence',
  Low: 'Low confidence',
  InsufficientEvidence: 'Insufficient evidence',
};

type ConfidenceTagProps = {
  confidence: ConfidenceLevel;
  className?: string;
};

/**
 * Renders a ConfidenceLevel using the Confidence token pairs — see
 * design-system.md's Confidence section. An outlined tag with no icon, not
 * a filled badge, so it never visually competes with a SeverityBadge on the
 * same card (an Issue can be Critical severity and Low confidence at once —
 * the two indicators must read as answering different questions).
 *
 * Accessibility: this text-on-surface pattern passes WCAG AA everywhere
 * this component is currently used (inside a Card, i.e. --color-surface-
 * elevated) — see design-system.md's Accessibility section for the measured
 * values. The one gap is InsufficientEvidence in light mode directly against
 * --color-surface-base (the page background, not a Card) at 4.32:1, just
 * under AA — don't place this tag outside a Card without rechecking.
 */
export function ConfidenceTag({ confidence, className }: ConfidenceTagProps) {
  const config = CONFIDENCE_CONFIG[confidence];

  return (
    <span
      role="status"
      aria-label={config.label}
      className={cn(
        'inline-flex items-center rounded-(--radius-full) border px-(--space-2) py-(--space-0-5) [font:var(--font-label)]',
        className,
      )}
      style={{
        borderColor: `var(${config.token})`,
        color: `var(${config.token})`,
      }}
    >
      {CONFIDENCE_TEXT[confidence]}
    </span>
  );
}
