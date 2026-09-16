import Link from 'next/link';
import { MessageSquare, Database } from '@/components/ui/icons';
import { getSession } from '@/lib/auth';
import { getMorningBriefData } from '@/lib/morning-brief';
import { getHealthScoreTrend } from '@/lib/health-score';
import { track } from '@/lib/analytics';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { ConfidenceTag } from '@/components/ui/ConfidenceTag';
import { EmptyState } from '@/components/ui/EmptyState';
import { HealthScoreDisplay } from '@/components/overview/HealthScoreDisplay';
import { RiskStatCard } from '@/components/overview/RiskStatCard';

// The Morning Brief — the first thing a user sees, every day the product is
// working. Server-rendered per architecture.md's Rendering Rules; never a
// client-side fetch before showing something meaningful. Structure follows
// design-system.md's Morning Brief Layout exactly: Operational Health Score
// -> Critical/Financial/Customer risk snapshot -> single top AI
// recommendation -> path into the Issues Feed. Decisions before charts.
export default async function OverviewPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const {
    healthScore,
    criticalIssueCount,
    overdueInvoiceCount,
    complaintsThisWeek,
    criticalTrend,
    overdueTrend,
    complaintsTrend,
    topRecommendation,
  } = await getMorningBriefData(organizationId);
  // Sequenced after getMorningBriefData, not Promise.all'd alongside it —
  // that call is what writes/updates today's snapshot (via
  // recomputeHealthScore), so reading the trend afterward guarantees
  // today's point is already in it rather than racing the write.
  const healthScoreTrend = await getHealthScoreTrend(organizationId);

  track('morning_brief_viewed', { organizationId });

  return (
    <div className="flex max-w-5xl flex-col gap-(--space-6)">
      <div>
        <h1 className="[font:var(--font-h1)]">
          Good morning, {session!.user.name?.split(' ')[0] ?? 'there'}.
        </h1>
        <p className="text-(--color-text-secondary) [font:var(--font-body)]">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      {/* First-run guidance — healthScore.overall is only null when there
          isn't enough real data yet to compute it (see HealthScoreDisplay's
          own "Insufficient data" fallback below), which is exactly the
          signal that this is a brand-new, empty organization. Without this,
          a new user sees five independent quiet zeros with nothing telling
          them where to start. */}
      {healthScore.overall === null && (
        <EmptyState
          icon={Database}
          title="Get your first Health Score"
          description="Upload a CSV of your orders, deliveries, invoices, or complaints and OpsLens will start surfacing what needs your attention here."
          action={
            <Link href="/data">
              <Button size="sm">Upload data</Button>
            </Link>
          }
        />
      )}

      <HealthScoreDisplay
        overall={healthScore.overall}
        components={healthScore.components}
        trend={healthScoreTrend}
      />

      <div className="grid grid-cols-1 gap-(--space-3) sm:grid-cols-3">
        <RiskStatCard
          label="Critical"
          value={criticalIssueCount}
          valueColorToken="--color-critical"
          detail="Issues need attention"
          trend={criticalTrend}
        />
        <RiskStatCard
          label="Financial risk"
          value={overdueInvoiceCount}
          detail="Outstanding invoices"
          trend={overdueTrend}
        />
        <RiskStatCard
          label="Customer risk"
          value={complaintsThisWeek}
          detail="Complaints this week"
          trend={complaintsTrend}
        />
      </div>

      {topRecommendation ? (
        <Card className="flex flex-col gap-(--space-2)">
          <div className="flex items-center justify-between">
            <span className="text-(--color-text-tertiary) [font:var(--font-label)]">
              AI Recommendation
            </span>
            <div className="flex items-center gap-(--space-2)">
              <SeverityBadge severity={topRecommendation.issue.severity} />
              <ConfidenceTag confidence={topRecommendation.confidence} />
            </div>
          </div>
          <h2 className="[font:var(--font-h3)]">{topRecommendation.title}</h2>
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            {topRecommendation.description}
          </p>
          <div className="flex items-center gap-(--space-3)">
            <Link href={`/issues/${topRecommendation.issueId}`}>
              <Button size="sm">Review this issue</Button>
            </Link>
            <Link
              href={`/assistant?seed=${encodeURIComponent(`Why is "${topRecommendation.issue.title}" happening?`)}`}
              className="inline-flex items-center gap-(--space-1) text-(--color-brand-accent) [font:var(--font-caption)] hover:underline"
            >
              <MessageSquare size={12} aria-hidden="true" />
              Ask AI about this
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            No recommendation yet. OpsLens needs more reliable operational data
            before suggesting an action.
          </p>
        </Card>
      )}

      <Link href="/issues" className="self-start">
        <Button variant="secondary">View all issues</Button>
      </Link>
    </div>
  );
}
