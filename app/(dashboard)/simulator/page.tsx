import { getSession } from '@/lib/auth';
import { calculateHealthScore, getHealthScoreInputs } from '@/lib/health-score';
import { ScenarioSimulator } from '@/components/simulator/ScenarioSimulator';

// Scenario Simulator — foundation only, per AGENTS.md's Should-Have scope.
// This page fetches the real "Observed" inputs server-side; all projection
// math happens client-side in ScenarioSimulator using the same pure,
// versioned calculateHealthScore function the real dashboard uses, so the
// "Estimated outcome" is never a fabricated number — it is what that exact
// formula would produce if the one assumption below were true.
export default async function SimulatorPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const inputs = await getHealthScoreInputs(organizationId);
  const observed = calculateHealthScore(inputs);

  return (
    <div className="flex max-w-2xl flex-col gap-(--space-4)">
      <div>
        <h1 className="[font:var(--font-h1)]">Scenario Simulator</h1>
        <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
          Foundation preview — currently models one lever (delivery delay rate)
          against your last 30 days of data.
        </p>
      </div>
      <ScenarioSimulator inputs={inputs} observed={observed} />
    </div>
  );
}
