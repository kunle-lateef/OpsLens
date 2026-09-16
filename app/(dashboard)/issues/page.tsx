import Link from 'next/link';
import { SearchX, CircleCheck } from '@/components/ui/icons';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { IssueSeverity } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterChips } from '@/components/issues/FilterChips';
import { SearchInput } from '@/components/issues/SearchInput';
import { IssuesTable } from '@/components/issues/IssuesTable';

function isIssueSeverity(value: string | undefined): value is IssueSeverity {
  return !!value && value in IssueSeverity;
}

// Operational issues requiring attention — see design-system.md's
// Progressive Disclosure principle and the master spec's Issues Feed
// section. A resolved or dismissed Issue is visually deprioritized, not
// silently hidden — see design-system.md's Color semantics note.
export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const { severity: severityParam, q } = await searchParams;
  const severityFilter = isIssueSeverity(severityParam) ? severityParam : null;
  const searchTerm = q?.trim() || null;

  const issues = await db.issue.findMany({
    where: {
      organizationId,
      ...(severityFilter ? { severity: severityFilter } : {}),
      ...(searchTerm
        ? { title: { contains: searchTerm, mode: 'insensitive' } }
        : {}),
    },
    include: { insight: true },
    orderBy: [{ priorityScore: 'desc' }, { detectedAt: 'desc' }],
    take: 50,
  });

  // impactAmount comes back from Prisma as a Decimal instance, which isn't
  // a plain serializable value — IssuesTable is a client component, so this
  // converts it to a real number before it ever crosses that boundary
  // rather than relying on downstream display code to coerce it.
  const plainIssues = issues.map((issue) => ({
    ...issue,
    impactAmount:
      issue.impactAmount === null ? null : Number(issue.impactAmount),
  }));

  const active = plainIssues.filter(
    (issue) => issue.status !== 'Resolved' && issue.status !== 'Dismissed',
  );
  const inactive = plainIssues.filter(
    (issue) => issue.status === 'Resolved' || issue.status === 'Dismissed',
  );

  return (
    <div className="flex max-w-5xl flex-col gap-(--space-6)">
      <div>
        <h1 className="[font:var(--font-h1)]">Issues</h1>
        <p className="text-(--color-text-secondary) [font:var(--font-body)]">
          Every detected issue, ranked by real impact — severity, urgency,
          and confidence.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-(--space-4)">
        <FilterChips active={severityFilter} />
        <SearchInput initialValue={q ?? ''} />
      </div>

      {active.length === 0 ? (
        searchTerm || severityFilter ? (
          <EmptyState
            icon={SearchX}
            title="No matching issues"
            description={
              searchTerm && severityFilter
                ? `No open ${severityFilter} issues match "${searchTerm}".`
                : searchTerm
                  ? `No open issues match "${searchTerm}".`
                  : `No open ${severityFilter} issues right now.`
            }
            action={
              <Link href="/issues">
                <Button variant="secondary" size="sm">
                  Clear filters
                </Button>
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={CircleCheck}
            title="No open issues right now"
            description="As operational data comes in, OpsLens will surface anything that needs your attention here."
            action={
              <Link href="/data">
                <Button variant="secondary" size="sm">
                  Upload data
                </Button>
              </Link>
            }
          />
        )
      ) : (
        <IssuesTable issues={active} />
      )}

      {inactive.length > 0 && (
        <div className="flex flex-col gap-(--space-2)">
          <h2 className="text-(--color-text-tertiary) [font:var(--font-h3)]">
            Resolved & dismissed
          </h2>
          <IssuesTable issues={inactive} muted />
        </div>
      )}
    </div>
  );
}
