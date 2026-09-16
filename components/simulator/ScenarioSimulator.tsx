'use client';

import { useMemo, useState } from 'react';
import {
  calculateHealthScore,
  type HealthScoreInputs,
  type HealthScoreResult,
} from '@/lib/health-score';
import { Card } from '@/components/ui/Card';

type ScenarioSimulatorProps = {
  inputs: HealthScoreInputs;
  observed: HealthScoreResult;
};

// Foundation-only Scenario Simulator (AGENTS.md's Should-Have scope, master
// spec's Scenario Simulator section). Every section is labeled so the three
// kinds of information are never visually ambiguous: Observed (queried,
// factual), Assumptions (the one thing the user is choosing to vary), and
// Estimated outcome (calculateHealthScore run again on the adjusted input —
// not a separate, unverifiable prediction model).
export function ScenarioSimulator({
  inputs,
  observed,
}: ScenarioSimulatorProps) {
  const [reductionPercent, setReductionPercent] = useState(25);

  const hasDeliveryData = inputs.delivery.totalDeliveries > 0;

  const estimated = useMemo(() => {
    if (!hasDeliveryData) return null;
    const adjustedDelayed = Math.round(
      inputs.delivery.delayedDeliveries * (1 - reductionPercent / 100),
    );
    return calculateHealthScore({
      ...inputs,
      delivery: {
        totalDeliveries: inputs.delivery.totalDeliveries,
        delayedDeliveries: adjustedDelayed,
      },
    });
  }, [inputs, reductionPercent, hasDeliveryData]);

  if (!hasDeliveryData) {
    return (
      <Card>
        <p className="text-(--color-text-secondary) [font:var(--font-body)]">
          Not enough delivery data in the last 30 days to simulate this scenario
          honestly. Import delivery records to unlock this lever.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-(--space-4)">
      <Card className="flex flex-col gap-(--space-2)">
        <span className="text-(--color-text-tertiary) uppercase [font:var(--font-overline-semi-bold)]">
          Observed
        </span>
        <h2 className="[font:var(--font-h3)]">
          Delivery performance (last 30 days)
        </h2>
        <p className="text-(--color-text-secondary) [font:var(--font-body)]">
          {inputs.delivery.delayedDeliveries} of{' '}
          {inputs.delivery.totalDeliveries} deliveries were delayed.
        </p>
        <p className="[font:var(--font-body)]">
          Current Operational Health Score:{' '}
          <span className="[font:var(--font-body-emphasis)]">
            {observed.overall ?? 'Insufficient data'}
          </span>
        </p>
      </Card>

      <Card className="flex flex-col gap-(--space-3)">
        <span className="text-(--color-text-tertiary) uppercase [font:var(--font-overline-semi-bold)]">
          Assumption
        </span>
        <label htmlFor="reduction" className="[font:var(--font-body)]">
          If delayed deliveries were reduced by{' '}
          <span className="[font:var(--font-body-emphasis)]">
            {reductionPercent}%
          </span>{' '}
          — holding delivery volume and every other factor constant —
        </label>
        <div className="flex flex-col gap-(--space-1)">
          <div className="relative pt-(--space-6)">
            <span
              aria-hidden="true"
              className="absolute top-0 -translate-x-1/2 rounded-(--radius-sm) border border-(--color-border-strong) bg-(--color-surface-base) px-(--space-1-5) py-(--space-0-5) tabular-nums text-(--color-text-primary) [font:var(--font-caption)]"
              style={{ left: `${reductionPercent}%` }}
            >
              {reductionPercent}%
            </span>
            <input
              id="reduction"
              type="range"
              min={0}
              max={100}
              step={5}
              value={reductionPercent}
              onChange={(event) =>
                setReductionPercent(Number(event.target.value))
              }
              className="range-slider w-full focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
              style={{
                background: `linear-gradient(to right, var(--color-brand-solid) ${reductionPercent}%, var(--color-border-subtle) ${reductionPercent}%)`,
              }}
            />
          </div>
          <div
            aria-hidden="true"
            className="flex justify-between px-(--space-0-5)"
          >
            {Array.from({ length: 11 }).map((_, i) => (
              <span
                key={i}
                className="h-(--space-1) w-px bg-(--color-border-subtle)"
              />
            ))}
          </div>
        </div>
        <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
          This is the only variable this foundation models. It does not account
          for knock-on effects on inventory, customer, or financial components,
          or for whether a {reductionPercent}% reduction is realistically
          achievable.
        </p>
      </Card>

      <Card
        className="flex flex-col gap-(--space-2)"
        style={{ borderColor: 'var(--color-brand-accent)' }}
      >
        <span className="text-(--color-brand-accent) uppercase [font:var(--font-overline-semi-bold)]">
          Estimated outcome
        </span>
        <p className="[font:var(--font-body)]">
          Projected Operational Health Score:{' '}
          <span className="[font:var(--font-body-emphasis)]">
            {estimated?.overall ?? 'Insufficient data'}
          </span>
          {observed.overall != null && estimated?.overall != null && (
            <span className="text-(--color-text-secondary)">
              {' '}
              ({estimated.overall >= observed.overall ? '+' : ''}
              {estimated.overall - observed.overall} vs. observed)
            </span>
          )}
        </p>
      </Card>
    </div>
  );
}
