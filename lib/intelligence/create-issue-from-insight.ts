import { db } from '@/lib/db';
import { calculatePriority } from '@/lib/prioritization';
import { estimateImpactFromInvoices } from '@/lib/intelligence/estimate-impact';
import {
  createNotification,
  issueSeverityToNotificationSeverity,
} from '@/lib/notifications';
import { logger } from '@/lib/logger';

// Issues are created deterministically from an Insight crossing the
// priority threshold — not an AI stage. See architecture.md's AI
// Processing section and Deterministic Scores section.
const PRIORITY_THRESHOLD_SCORE = 15; // "High" and above — see lib/prioritization.ts's THRESHOLDS

export type CreateIssueResult = { issueId: string; isNew: boolean } | null;

/**
 * Returns the Issue (with whether it's newly created) if one exists or was
 * just created, or null if this Insight doesn't cross the priority
 * threshold yet. Idempotent — safe to call again for an Insight that
 * already has an Issue (a retried workflow step must not create a
 * duplicate).
 *
 * `isNew` matters beyond idempotency: the caller (see
 * lib/intelligence/analyze-organization.ts and lib/workflows.ts) only
 * generates Recommendations for a newly-created Issue. Without that check,
 * every re-run of the pipeline would call generateRecommendations again for
 * every pre-existing Issue, creating duplicate Pending recommendations
 * alongside ones a human may have already Accepted/Rejected/Modified —
 * exactly the kind of silent pile-up architecture.md's Data Flow section
 * and AGENTS.md's Non-Negotiable #3 exist to prevent.
 */
export async function createIssueFromInsight(
  insightId: string,
): Promise<CreateIssueResult> {
  const existing = await db.issue.findFirst({ where: { insightId } });
  if (existing) return { issueId: existing.id, isNew: false };

  const insight = await db.insight.findUniqueOrThrow({
    where: { id: insightId },
    include: { evidence: true },
  });

  const ageInHours =
    (Date.now() - insight.detectedAt.getTime()) / (60 * 60 * 1000);
  const affectedCustomerCount = await db.complaint.count({
    where: {
      organizationId: insight.organizationId,
      createdAt: { gte: insight.detectedAt },
    },
  });

  const priority = calculatePriority({
    severity: insight.severity,
    confidence: insight.confidence,
    impactScore: insight.impactScore,
    affectedCustomerCount,
    ageInHours,
  });

  if (priority.score < PRIORITY_THRESHOLD_SCORE) {
    logger.info('create_issue.below_threshold', {
      insightId,
      score: priority.score,
    });
    return null;
  }

  // Business-impact figure — deliberately narrow (invoice-derived only for
  // now), see db-migration-runner/SKILL.md's Issue.impactAmount note for
  // why this doesn't attempt to cover every issue type yet. Gated on the
  // insight's own evidence actually referencing invoice/overdue data, so a
  // warehouse or delivery issue never gets an unrelated financial figure
  // attached to it just because the org happens to have overdue invoices.
  const isInvoiceRelated = insight.evidence.some(
    (evidence) =>
      /invoice|overdue/i.test(evidence.sourceType) ||
      /invoice|overdue/i.test(evidence.description),
  );
  let impact = null as ReturnType<typeof estimateImpactFromInvoices>;
  if (isInvoiceRelated) {
    const overdueInvoices = await db.invoice.findMany({
      where: {
        organizationId: insight.organizationId,
        status: 'overdue',
        dueAt: { lte: insight.detectedAt },
      },
      select: { amount: true, currency: true },
    });
    impact = estimateImpactFromInvoices(
      overdueInvoices.map((invoice) => ({
        amount: Number(invoice.amount),
        currency: invoice.currency,
      })),
    );
  }

  const issue = await db.issue.create({
    data: {
      organizationId: insight.organizationId,
      insightId,
      title: insight.title,
      description: insight.summary,
      severity: insight.severity,
      priorityScore: priority.score,
      priorityAlgorithmVersion: priority.algorithmVersion,
      status: 'Detected',
      impactAmount: impact?.amount,
      impactCurrency: impact?.currency,
    },
  });

  await createNotification({
    organizationId: insight.organizationId,
    severity: issueSeverityToNotificationSeverity(issue.severity),
    message: `New ${issue.severity} issue: ${issue.title}`,
    linkUrl: `/issues/${issue.id}`,
    eventId: issue.id,
  });

  logger.info('create_issue.created', {
    insightId,
    issueId: issue.id,
    priority: priority.label,
  });
  return { issueId: issue.id, isNew: true };
}
