import type { ConfidenceLevel, IssueSeverity } from '@prisma/client';

// Issue priority score — see architecture.md's Deterministic Scores
// section: Priority = Business Impact x Urgency x Confidence x Customer
// Impact x Operational Impact, normalized to a predictable scale, computed
// as a pure function over already-persisted data, never a model call.
//
// The exact weighting is explicitly "not decided" in architecture.md — this
// file is a documented, versioned v1 choice, not a guess presented as
// settled. Bump PRIORITY_ALGORITHM_VERSION if the formula or thresholds
// change; see lib/prioritization.test.ts for the exact behavior this
// version locks in.
export const PRIORITY_ALGORITHM_VERSION = 1;

export type PriorityLabel = 'Critical' | 'High' | 'Medium' | 'Low';

export type PriorityInputs = {
  severity: IssueSeverity;
  confidence: ConfidenceLevel;
  /** 0-100, from the Insight — proxy for Business Impact + Operational Impact. */
  impactScore: number | null;
  /** Proxy for Customer Impact. */
  affectedCustomerCount: number;
  /** Proxy for Urgency — older, still-unresolved signals are more urgent, not less. */
  ageInHours: number;
};

export type PriorityResult = {
  score: number;
  label: PriorityLabel;
  algorithmVersion: number;
};

const SEVERITY_WEIGHT: Record<IssueSeverity, number> = {
  Critical: 1,
  High: 0.75,
  Medium: 0.5,
  Low: 0.25,
};

// InsufficientEvidence deliberately floors near zero, not just "low" — a
// finding the system isn't sure about should rarely out-rank one it is sure
// about, regardless of how severe it looks on its face.
const CONFIDENCE_WEIGHT: Record<ConfidenceLevel, number> = {
  High: 1,
  Medium: 0.7,
  Low: 0.4,
  InsufficientEvidence: 0.1,
};

// Users see Critical/High/Medium/Low, never this raw score — see
// architecture.md's Deterministic Scores section: "Do not expose a
// mathematically complex formula to users unless necessary."
const THRESHOLDS: { min: number; label: PriorityLabel }[] = [
  { min: 35, label: 'Critical' },
  { min: 15, label: 'High' },
  { min: 5, label: 'Medium' },
  { min: 0, label: 'Low' },
];

export function calculatePriority(inputs: PriorityInputs): PriorityResult {
  const businessImpact = SEVERITY_WEIGHT[inputs.severity];
  const urgency = Math.max(0.2, Math.min(1, inputs.ageInHours / 72)); // caps at 3 days unresolved
  const confidence = CONFIDENCE_WEIGHT[inputs.confidence];
  const customerImpact = Math.max(
    0.1,
    Math.min(1, inputs.affectedCustomerCount / 20),
  );
  const operationalImpact = (inputs.impactScore ?? 50) / 100;

  const rawScore =
    businessImpact * urgency * confidence * customerImpact * operationalImpact;
  const score = Math.round(rawScore * 100);

  const label = THRESHOLDS.find((t) => score >= t.min)!.label;

  return { score, label, algorithmVersion: PRIORITY_ALGORITHM_VERSION };
}
