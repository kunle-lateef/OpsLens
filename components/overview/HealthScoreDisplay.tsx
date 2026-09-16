import {
  TREND_WINDOW_DAYS,
  type HealthComponentKey,
  type HealthComponentResult,
} from '@/lib/health-score';
import { Card } from '@/components/ui/Card';
import { Sparkline } from '@/components/overview/Sparkline';
import { cn } from '@/lib/cn';

const COMPONENT_LABEL: Record<HealthComponentKey, string> = {
  delivery: 'Delivery',
  inventory: 'Inventory',
  customer: 'Customer',
  financial: 'Financial',
  incident: 'Incident',
};

type HealthScoreDisplayProps = {
  overall: number | null;
  components: Record<HealthComponentKey, HealthComponentResult>;
  /** Oldest-first daily scores for the trend sparkline — see lib/health-score.ts's getHealthScoreTrend. Omit or pass fewer than 2 values to render no trend rather than a fabricated one. */
  trend?: number[];
  className?: string;
};

function componentColor(score: number) {
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-medium)';
  return 'var(--color-critical)';
}

/**
 * Displays the Operational Health Score together with its five component
 * breakdowns — never the number alone. A component lacking sufficient data
 * renders an explicit "insufficient data" state rather than being silently
 * omitted or averaged around — see design-system.md's HealthScoreDisplay
 * section and architecture.md's Deterministic Scores section.
 */
export function HealthScoreDisplay({
  overall,
  components,
  trend,
  className,
}: HealthScoreDisplayProps) {
  const hasTrend = trend && trend.length >= 2;
  const delta = hasTrend ? trend[trend.length - 1] - trend[0] : null;

  return (
    <Card className={cn('flex flex-col gap-(--space-4)', className)}>
      {/* Stacks below sm — at narrow widths the label was squeezed into a
          3-line wrap fighting the sparkline's fixed 160px width for room.
          Row layout (score+label beside the trend) only kicks in once
          there's enough width for both to breathe. */}
      <div className="flex flex-col gap-(--space-3) sm:flex-row sm:items-center sm:justify-between sm:gap-(--space-4)">
        <div className="flex items-baseline gap-(--space-2)">
          <span className="text-(--color-text-primary) tabular-nums [font:var(--font-display)]">
            {overall ?? '—'}
          </span>
          <span className="text-(--color-text-secondary) [font:var(--font-body)]">
            {overall === null
              ? 'Insufficient data to calculate a reliable score'
              : '/ 100 · Operational Health'}
          </span>
        </div>

        {hasTrend && delta !== null && (
          <div className="flex flex-row items-center gap-(--space-2) sm:flex-col sm:items-end sm:gap-(--space-1)">
            <Sparkline
              points={trend}
              width={160}
              height={36}
              color={
                delta >= 0 ? 'var(--color-success)' : 'var(--color-critical)'
              }
            />
            <span
              className="tabular-nums [font:var(--font-caption)]"
              style={{
                color:
                  delta >= 0 ? 'var(--color-success)' : 'var(--color-critical)',
              }}
            >
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} over last{' '}
              {TREND_WINDOW_DAYS} days
            </span>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-(--space-3) sm:grid-cols-5">
        {(Object.keys(components) as HealthComponentKey[]).map((key) => {
          const result = components[key];
          return (
            <div key={key} className="flex flex-col gap-(--space-0-5)">
              <dt className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                {COMPONENT_LABEL[key]}
              </dt>
              <dd
                className="tabular-nums [font:var(--font-h3)]"
                style={{
                  color:
                    result.score === null
                      ? 'var(--color-text-tertiary)'
                      : componentColor(result.score),
                }}
              >
                {result.score === null ? 'No data' : result.score}
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}
