import { TREND_WINDOW_DAYS } from '@/lib/morning-brief-snapshots';
import { Card } from '@/components/ui/Card';
import { Sparkline } from '@/components/overview/Sparkline';

type RiskStatCardProps = {
  label: string;
  value: number;
  /** A token like '--color-critical' for the headline figure — omit for the default text color. */
  valueColorToken?: string;
  detail: string;
  trend: number[];
};

/**
 * A Morning Brief risk card with trend context — see
 * lib/morning-brief-snapshots.ts. All three risk metrics (critical issues,
 * overdue invoices, complaints) are "higher is bad," unlike the Health
 * Score's sparkline where higher is good — this component's delta coloring
 * is hardcoded to that direction rather than taking a prop for it, since
 * every current call site needs the same direction and a prop nobody
 * varies is just noise. Renders no trend at all below 2 data points, per
 * the same "insufficient data ≠ fabricated" rule as HealthScoreDisplay.
 */
export function RiskStatCard({
  label,
  value,
  valueColorToken,
  detail,
  trend,
}: RiskStatCardProps) {
  const hasTrend = trend.length >= 2;
  const delta = hasTrend ? trend[trend.length - 1] - trend[0] : null;
  const deltaColor =
    delta === null || delta === 0
      ? 'var(--color-text-tertiary)'
      : delta > 0
        ? 'var(--color-critical)'
        : 'var(--color-success)';

  return (
    <Card className="flex flex-col gap-(--space-1)">
      <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
        {label}
      </span>
      <span
        className="tabular-nums [font:var(--font-display)]"
        style={
          valueColorToken ? { color: `var(${valueColorToken})` } : undefined
        }
      >
        {value}
      </span>
      <span className="text-(--color-text-secondary) [font:var(--font-caption)]">
        {detail}
      </span>
      {/* Stacks below lg — this card sits in a 3-column grid that starts at
          sm (640px), so from sm up to roughly lg the card itself is too
          narrow for the sparkline and trend text to share one row without
          the text wrapping. Verified: at 768px the row has ~123px total, of
          which the sparkline alone claims ~72px. Stacking removes the
          competition entirely rather than trying to out-shrink it. */}
      {hasTrend && delta !== null && (
        <div className="mt-(--space-1) flex flex-col items-start gap-(--space-1) lg:flex-row lg:items-center lg:gap-(--space-2)">
          <Sparkline points={trend} color={deltaColor} width={104} height={24} />
          <span
            className="tabular-nums [font:var(--font-caption)]"
            style={{ color: deltaColor }}
          >
            {delta === 0
              ? `Flat / ${TREND_WINDOW_DAYS}d`
              : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} / ${TREND_WINDOW_DAYS}d`}
          </span>
        </div>
      )}
    </Card>
  );
}
