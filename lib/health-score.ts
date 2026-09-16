import { db } from '@/lib/db';

// Operational Health Score — see architecture.md's Deterministic Scores
// section: a pure, versioned function over already-persisted data, never a
// model call. Bump HEALTH_SCORE_ALGORITHM_VERSION whenever the formula
// changes so a v1 score and a v2 score are never silently treated as
// comparable — see lib/health-score.test.ts for the exact behavior this
// version locks in.
export const HEALTH_SCORE_ALGORITHM_VERSION = 1;

// Configurable in the architecture, not hardcoded inline wherever the score
// is displayed — see architecture.md's Deterministic Scores section. Equal
// weighting is a documented v1 choice, not a claim that all five components
// matter equally in every business — revisit by bumping the version.
export const HEALTH_SCORE_WEIGHTS = {
  delivery: 0.2,
  inventory: 0.2,
  customer: 0.2,
  financial: 0.2,
  incident: 0.2,
} as const;

export type HealthComponentKey = keyof typeof HEALTH_SCORE_WEIGHTS;

export type HealthComponentResult =
  { score: number } | { score: null; reason: 'insufficient_data' };

export type HealthScoreInputs = {
  delivery: { totalDeliveries: number; delayedDeliveries: number };
  inventory: { totalInventoryItems: number; lowStockEvents: number };
  customer: { totalOrders: number; complaints: number };
  financial: { totalInvoicedAmount: number; overdueAmount: number };
  incident: { totalEvents: number; highSeverityEvents: number };
};

export type HealthScoreResult = {
  overall: number | null;
  algorithmVersion: number;
  components: Record<HealthComponentKey, HealthComponentResult>;
};

function scoreFromRate(badCount: number, total: number): HealthComponentResult {
  if (total === 0) return { score: null, reason: 'insufficient_data' };
  const rate = badCount / total;
  return { score: Math.max(0, Math.min(100, Math.round((1 - rate) * 100))) };
}

/**
 * Pure function — same inputs always produce the same output, and the
 * output can be explained by pointing at the rows that fed it, not by
 * re-asking an AI. If a component lacks sufficient underlying data, it
 * returns an explicit insufficient-data state rather than silently
 * averaging around the gap — see architecture.md's Deterministic Scores
 * section and the master spec's Operational Health Score section.
 */
export function calculateHealthScore(
  inputs: HealthScoreInputs,
): HealthScoreResult {
  const components: Record<HealthComponentKey, HealthComponentResult> = {
    delivery: scoreFromRate(
      inputs.delivery.delayedDeliveries,
      inputs.delivery.totalDeliveries,
    ),
    inventory:
      inputs.inventory.totalInventoryItems === 0
        ? { score: null, reason: 'insufficient_data' }
        : { score: Math.max(0, 100 - inputs.inventory.lowStockEvents * 10) },
    customer: scoreFromRate(
      inputs.customer.complaints,
      inputs.customer.totalOrders,
    ),
    financial:
      inputs.financial.totalInvoicedAmount === 0
        ? { score: null, reason: 'insufficient_data' }
        : {
            score: Math.max(
              0,
              Math.round(
                (1 -
                  inputs.financial.overdueAmount /
                    inputs.financial.totalInvoicedAmount) *
                  100,
              ),
            ),
          },
    incident:
      inputs.incident.totalEvents === 0
        ? { score: null, reason: 'insufficient_data' }
        : { score: Math.max(0, 100 - inputs.incident.highSeverityEvents * 5) },
  };

  const available = (Object.keys(components) as HealthComponentKey[]).filter(
    (key) => components[key].score !== null,
  );

  if (available.length === 0) {
    return {
      overall: null,
      algorithmVersion: HEALTH_SCORE_ALGORITHM_VERSION,
      components,
    };
  }

  const totalWeight = available.reduce(
    (sum, key) => sum + HEALTH_SCORE_WEIGHTS[key],
    0,
  );
  const weightedSum = available.reduce(
    (sum, key) =>
      sum + (components[key].score as number) * HEALTH_SCORE_WEIGHTS[key],
    0,
  );

  return {
    overall: Math.round(weightedSum / totalWeight),
    algorithmVersion: HEALTH_SCORE_ALGORITHM_VERSION,
    components,
  };
}

const WINDOW_DAYS = 30;

/**
 * The last-30-days query set that feeds calculateHealthScore, split out from
 * recomputeHealthScore so the Scenario Simulator (which needs the same
 * "Observed" inputs to project from, but must never write a cached score)
 * can reuse it without duplicating every query.
 */
export async function getHealthScoreInputs(
  organizationId: string,
): Promise<HealthScoreInputs> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    totalDeliveries,
    delayedDeliveries,
    totalInventoryItems,
    lowStockEvents,
    totalOrders,
    complaints,
    invoices,
    totalEvents,
    highSeverityEvents,
  ] = await Promise.all([
    db.delivery.count({ where: { organizationId, createdAt: { gte: since } } }),
    db.operationalEvent.count({
      where: {
        organizationId,
        type: 'DELIVERY_DELAYED',
        timestamp: { gte: since },
      },
    }),
    db.inventoryItem.count({ where: { organizationId } }),
    db.operationalEvent.count({
      where: {
        organizationId,
        type: 'INVENTORY_LOW',
        timestamp: { gte: since },
      },
    }),
    db.order.count({ where: { organizationId, createdAt: { gte: since } } }),
    db.complaint.count({
      where: { organizationId, createdAt: { gte: since } },
    }),
    db.invoice.findMany({
      where: { organizationId, issuedAt: { gte: since } },
      select: { amount: true, status: true },
    }),
    db.operationalEvent.count({
      where: { organizationId, timestamp: { gte: since } },
    }),
    db.operationalEvent.count({
      where: {
        organizationId,
        severity: { in: ['Critical', 'High'] },
        timestamp: { gte: since },
      },
    }),
  ]);

  const totalInvoicedAmount = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.amount),
    0,
  );
  const overdueAmount = invoices
    .filter((invoice) => invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return {
    delivery: { totalDeliveries, delayedDeliveries },
    inventory: { totalInventoryItems, lowStockEvents },
    customer: { totalOrders, complaints },
    financial: { totalInvoicedAmount, overdueAmount },
    incident: { totalEvents, highSeverityEvents },
  };
}

/**
 * Gathers this organization's last 30 days of data and recomputes + caches
 * the score — see architecture.md's Deterministic Scores section: "Both
 * scores are recalculated and cached... whenever a write changes an input
 * that feeds them." Call after ingestion and after any Issue/Recommendation
 * decision that could move the inputs.
 */
export async function recomputeHealthScore(
  organizationId: string,
): Promise<HealthScoreResult> {
  const inputs = await getHealthScoreInputs(organizationId);
  const result = calculateHealthScore(inputs);

  await db.organization.update({
    where: { id: organizationId },
    data: {
      healthScore: result.overall,
      healthScoreAlgorithmVersion: result.algorithmVersion,
    },
  });

  await recordDailySnapshot(organizationId, result.overall);

  return result;
}

// This runs on every Morning Brief page view (see lib/morning-brief.ts),
// not only when the underlying data actually changes — see
// db-migration-runner/SKILL.md's HealthScoreSnapshot note for why that
// means "insert unconditionally" would be wrong here. One row per
// organization per calendar day; a second call the same day updates the
// existing row instead of adding another.
async function recordDailySnapshot(
  organizationId: string,
  overall: number | null,
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existing = await db.healthScoreSnapshot.findFirst({
    where: { organizationId, capturedAt: { gte: todayStart } },
  });

  if (existing) {
    await db.healthScoreSnapshot.update({
      where: { id: existing.id },
      data: { overall },
    });
  } else {
    await db.healthScoreSnapshot.create({
      data: { organizationId, overall },
    });
  }
}

export const TREND_WINDOW_DAYS = 14;

/**
 * Recent daily scores for the trend sparkline, oldest first. Only non-null
 * values — an insufficient-data day breaks the line rather than being
 * plotted as 0, which would misread as a real score crash.
 */
export async function getHealthScoreTrend(
  organizationId: string,
): Promise<number[]> {
  const since = new Date(Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const snapshots = await db.healthScoreSnapshot.findMany({
    where: {
      organizationId,
      capturedAt: { gte: since },
      overall: { not: null },
    },
    orderBy: { capturedAt: 'asc' },
    select: { overall: true },
  });
  return snapshots.map((s) => s.overall as number);
}
