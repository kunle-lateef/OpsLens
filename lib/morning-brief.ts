import { db } from '@/lib/db';
import {
  recomputeHealthScore,
  type HealthScoreResult,
} from '@/lib/health-score';
import {
  recordDailySnapshot,
  getSnapshotTrend,
} from '@/lib/morning-brief-snapshots';

export type MorningBriefData = {
  healthScore: HealthScoreResult;
  criticalIssueCount: number;
  overdueInvoiceCount: number;
  complaintsThisWeek: number;
  criticalTrend: number[];
  overdueTrend: number[];
  complaintsTrend: number[];
  topRecommendation:
    | (Awaited<
        ReturnType<
          typeof db.recommendation.findFirst<{ include: { issue: true } }>
        >
      > &
        object)
    | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Gathers everything the Morning Brief page needs. Extracted out of the
 * page component itself (not just for testability) — computing date ranges
 * from the current time directly inside a component function trips React's
 * purity/idempotency rule (a component render must not call an impure
 * function like Date.now()); a plain helper function has no such
 * constraint.
 */
export async function getMorningBriefData(
  organizationId: string,
): Promise<MorningBriefData> {
  const now = Date.now();
  const oneWeekAgo = new Date(now - 7 * DAY_MS);

  const [
    healthScore,
    criticalIssueCount,
    overdueInvoiceCount,
    complaintsThisWeek,
    topRecommendation,
  ] = await Promise.all([
    recomputeHealthScore(organizationId),
    db.issue.count({
      where: {
        organizationId,
        severity: 'Critical',
        status: { notIn: ['Resolved', 'Dismissed'] },
      },
    }),
    db.invoice.count({ where: { organizationId, status: 'overdue' } }),
    db.complaint.count({
      where: { organizationId, createdAt: { gte: oneWeekAgo } },
    }),
    db.recommendation.findFirst({
      where: { organizationId, status: 'Pending' },
      orderBy: [{ issue: { priorityScore: 'desc' } }, { createdAt: 'desc' }],
      include: { issue: true },
    }),
  ]);

  // Sequenced after the reads above, and the trend reads sequenced after
  // these writes — see lib/morning-brief-snapshots.ts's day-bucketing note
  // and lib/health-score.ts's identical pattern for why order matters here
  // (today's point must be committed before it's read back for the trend).
  await Promise.all([
    recordDailySnapshot(organizationId, 'critical_issues', criticalIssueCount),
    recordDailySnapshot(
      organizationId,
      'overdue_invoices',
      overdueInvoiceCount,
    ),
    recordDailySnapshot(organizationId, 'complaints_7d', complaintsThisWeek),
  ]);

  const [criticalTrend, overdueTrend, complaintsTrend] = await Promise.all([
    getSnapshotTrend(organizationId, 'critical_issues'),
    getSnapshotTrend(organizationId, 'overdue_invoices'),
    getSnapshotTrend(organizationId, 'complaints_7d'),
  ]);

  return {
    healthScore,
    criticalIssueCount,
    overdueInvoiceCount,
    complaintsThisWeek,
    criticalTrend,
    overdueTrend,
    complaintsTrend,
    topRecommendation,
  };
}
