import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { daysAgo } from '@/lib/date-range';
import { findRelatedOpenIssue } from '@/lib/intelligence/related-issue';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/departments/StatCard';
import { RelatedIssueNote } from '@/components/departments/RelatedIssueNote';

const RELATED_KEYWORDS = ['complaint', 'customer'];

export default async function CustomerDepartmentPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const since = daysAgo(30);

  const [complaints, categoryBreakdown, relatedIssue] = await Promise.all([
    db.complaint.findMany({
      where: { organizationId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    }),
    db.complaint.groupBy({
      by: ['category'],
      where: { organizationId, createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
    }),
    findRelatedOpenIssue(organizationId, RELATED_KEYWORDS),
  ]);

  const escalations = complaints.filter(
    (c) => c.severity === 'High' || c.severity === 'Critical',
  );

  return (
    <div className="flex flex-col gap-(--space-4)">
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        Complaint volume and severity over the last 30 days.
      </p>

      <div className="grid grid-cols-1 gap-(--space-3) sm:grid-cols-3">
        <StatCard label="Complaints (30d)" value={complaints.length} />
        <StatCard
          label="Escalations"
          value={escalations.length}
          detail="High/Critical severity"
        />
        <StatCard label="Categories" value={categoryBreakdown.length} />
      </div>

      <RelatedIssueNote issue={relatedIssue} />

      <Card className="flex flex-col gap-(--space-2)">
        <h2 className="[font:var(--font-h3)]">Complaints by category</h2>
        {categoryBreakdown.length === 0 ? (
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            No complaints in the last 30 days.
          </p>
        ) : (
          <ul className="flex flex-col gap-(--space-1)">
            {categoryBreakdown.map((row) => (
              <li
                key={row.category ?? 'uncategorized'}
                className="flex justify-between [font:var(--font-body)]"
              >
                <span>{row.category ?? 'Uncategorized'}</span>
                <span className="text-(--color-text-secondary) tabular-nums">
                  {row._count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
