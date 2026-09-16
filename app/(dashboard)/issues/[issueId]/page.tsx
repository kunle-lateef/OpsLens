import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare } from '@/components/ui/icons';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { track } from '@/lib/analytics';
import { humanizeAuditLogEntry } from '@/lib/audit-log-labels';
import { Card } from '@/components/ui/Card';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { ConfidenceTag } from '@/components/ui/ConfidenceTag';
import { StatusStepper } from '@/components/issues/StatusStepper';
import { EvidencePanel } from '@/components/issues/EvidencePanel';
import { CausalChain } from '@/components/issues/CausalChain';
import { IssueStatusControls } from '@/components/issues/IssueStatusControls';
import { RecommendationCard } from '@/components/issues/RecommendationCard';

// Issue Detail — the moment a user's trust in OpsLens is made or broken.
// Structure follows design-system.md's Issue Detail Layout exactly:
// Summary -> Evidence -> Root Cause -> Recommendation -> Human Decision
// Controls -> Activity History. Every section visually distinguishes
// confirmed data from AI-inferred content from an open human decision.
export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  const session = await getSession();

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: {
      insight: { include: { evidence: true } },
      recommendations: { orderBy: { createdAt: 'asc' } },
      assignee: true,
    },
  });

  if (!issue || issue.organizationId !== session!.user.organizationId) {
    notFound();
  }

  const auditLog = await db.auditLog.findMany({
    where: {
      organizationId: issue.organizationId,
      entityType: { in: ['Issue', 'Recommendation'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const relevantAuditLog = auditLog.filter(
    (entry) =>
      entry.entityId === issue.id ||
      issue.recommendations.some((r) => r.id === entry.entityId),
  );

  track('issue_opened', {
    organizationId: issue.organizationId,
    issueId: issue.id,
  });

  return (
    <div className="flex max-w-2xl flex-col gap-(--space-6)">
      {/* Summary */}
      <div className="flex flex-col gap-(--space-2)">
        <div className="flex items-center gap-(--space-2)">
          <SeverityBadge severity={issue.severity} />
          <ConfidenceTag confidence={issue.insight.confidence} />
          {issue.priorityScore !== null && (
            <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
              Priority score: {issue.priorityScore}
            </span>
          )}
        </div>
        <h1 className="[font:var(--font-h1)]">{issue.title}</h1>
        <p className="text-(--color-text-secondary) [font:var(--font-body)]">
          {issue.insight.summary}
        </p>
        <StatusStepper status={issue.status} />
        <Link
          href={`/assistant?seed=${encodeURIComponent(`Why is "${issue.title}" happening?`)}`}
          className="inline-flex items-center gap-(--space-1) self-start text-(--color-brand-accent) [font:var(--font-caption)] hover:underline"
        >
          <MessageSquare size={12} aria-hidden="true" />
          Ask AI about this issue
        </Link>
      </div>

      {/* Business impact — see db-migration-runner/SKILL.md's
          Issue.impactAmount note: only populated when it can be computed
          from real invoice data, never estimated to fill the space. */}
      <div className="flex flex-wrap items-baseline gap-(--space-2) rounded-(--radius-md) border border-(--color-brand-accent) bg-(--color-brand-tint-subtle) p-(--space-4)">
        <span className="text-(--color-text-tertiary) [font:var(--font-label)]">
          Business impact
        </span>
        <span className="tabular-nums [font:var(--font-h1)]">
          {issue.impactAmount !== null
            ? `$${Number(issue.impactAmount).toLocaleString()}`
            : 'Not yet quantified'}
        </span>
      </div>

      {/* Evidence */}
      <EvidencePanel
        evidence={issue.insight.evidence
          .filter((e) => e.sourceType !== 'contributing_factor')
          .map((e) => ({
            id: e.id,
            sourceType: e.sourceType,
            description: e.description,
            metricValue: e.metricValue,
            comparisonValue: e.comparisonValue,
            period: e.period,
          }))}
      />

      {/* Root Cause */}
      <Card className="flex flex-col gap-(--space-3)">
        <h2 className="[font:var(--font-h2)]">Root Cause</h2>
        {issue.insight.rootCauseNarrative ? (
          <>
            <p className="text-(--color-text-secondary) [font:var(--font-body)]">
              {issue.insight.rootCauseNarrative}
            </p>
            <CausalChain
              outcome={issue.title}
              factors={issue.insight.evidence
                .filter((e) => e.sourceType === 'contributing_factor')
                .map((e) => ({ id: e.id, description: e.description }))}
            />
          </>
        ) : (
          <p className="text-(--color-text-tertiary) [font:var(--font-body)]">
            Not yet established — this insight didn&apos;t clear the confidence
            bar for a root-cause explanation.
          </p>
        )}
      </Card>

      {/* Recommendation */}
      <div className="flex flex-col gap-(--space-3)">
        <h2 className="[font:var(--font-h2)]">Recommendations</h2>
        {issue.recommendations.length === 0 ? (
          <Card>
            <p className="text-(--color-text-tertiary) [font:var(--font-body)]">
              No recommendation yet. OpsLens needs more reliable operational
              data before suggesting an action.
            </p>
          </Card>
        ) : (
          issue.recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
            />
          ))
        )}
      </div>

      {/* Human Decision Controls — IssueStatusControls itself renders
          nothing once an issue is Resolved/Dismissed (reopening one would
          silently undo a recorded human decision, which this app never
          allows), which previously left this whole section looking blank.
          Fill that space with what actually happened instead, using data
          already on the row — see the developer-approved audit fix. */}
      <div className="flex flex-col gap-(--space-2)">
        <h2 className="[font:var(--font-h2)]">Issue Status</h2>
        {issue.status === 'Resolved' || issue.status === 'Dismissed' ? (
          <p className="flex items-center gap-(--space-2) text-(--color-text-secondary) [font:var(--font-caption)]">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-(--radius-full) bg-(--color-success)"
            />
            {issue.status === 'Resolved'
              ? `Resolved on ${(issue.resolvedAt ?? issue.updatedAt).toLocaleDateString()}`
              : `Dismissed on ${issue.updatedAt.toLocaleDateString()}`}
          </p>
        ) : (
          <IssueStatusControls issueId={issue.id} status={issue.status} />
        )}
      </div>

      {/* Activity History */}
      {relevantAuditLog.length > 0 && (
        <div className="flex flex-col gap-(--space-2)">
          <h2 className="[font:var(--font-h2)]">Activity History</h2>
          <ul className="flex flex-col gap-(--space-2)">
            {relevantAuditLog.map((entry) => (
              <li
                key={entry.id}
                className="text-(--color-text-secondary) [font:var(--font-caption)]"
              >
                {entry.createdAt.toLocaleString()} —{' '}
                {humanizeAuditLogEntry(entry)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
