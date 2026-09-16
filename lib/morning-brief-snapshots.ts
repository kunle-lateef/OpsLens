import { db } from '@/lib/db';

// Daily history for the Morning Brief's risk cards — see
// db-migration-runner/SKILL.md's MorningBriefSnapshot note for why this is
// a separate table from Metric (which the AI pipeline reads as real
// operational data) rather than reusing it.
export type MorningBriefSnapshotKey =
  'critical_issues' | 'overdue_invoices' | 'complaints_7d';

export const TREND_WINDOW_DAYS = 14;

// Same day-bucketing rationale as lib/health-score.ts's recordDailySnapshot:
// getMorningBriefData runs on every Overview page view, not only when the
// underlying counts change, so this updates today's row in place instead of
// inserting one per page view.
export async function recordDailySnapshot(
  organizationId: string,
  key: MorningBriefSnapshotKey,
  value: number,
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existing = await db.morningBriefSnapshot.findFirst({
    where: { organizationId, key, capturedAt: { gte: todayStart } },
  });

  if (existing) {
    await db.morningBriefSnapshot.update({
      where: { id: existing.id },
      data: { value },
    });
  } else {
    await db.morningBriefSnapshot.create({
      data: { organizationId, key, value },
    });
  }
}

/** Recent daily values for one risk-card metric, oldest first. */
export async function getSnapshotTrend(
  organizationId: string,
  key: MorningBriefSnapshotKey,
): Promise<number[]> {
  const since = new Date(Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const snapshots = await db.morningBriefSnapshot.findMany({
    where: {
      organizationId,
      key,
      capturedAt: { gte: since },
      value: { not: null },
    },
    orderBy: { capturedAt: 'asc' },
    select: { value: true },
  });
  return snapshots.map((s) => s.value as number);
}
