import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/Card';
import { GenerateReportButton } from '@/components/reports/GenerateReportButton';

// Weekly and historical intelligence reports — see the master spec's
// section 24. No scheduling mechanism exists yet (see
// db-migration-runner/SKILL.md's Report model note), so generation is
// manual for now via the button below.
export default async function ReportsPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const reports = await db.report.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div className="flex max-w-5xl flex-col gap-(--space-6)">
      <div className="flex flex-col items-start gap-(--space-4) sm:flex-row sm:justify-between">
        <div>
          <h1 className="[font:var(--font-h1)]">Reports</h1>
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            Weekly summaries of what changed, what&apos;s at risk, and
            what&apos;s predicted.
          </p>
        </div>
        <GenerateReportButton />
      </div>

      {reports.length === 0 ? (
        <Card>
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            No reports yet. Generate this week&apos;s report to get an executive
            summary of what improved, what deteriorated, and what OpsLens
            recommends focusing on next.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-(--space-2)">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="block rounded-(--radius-lg) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
            >
              <Card className="flex items-center justify-between hover:border-(--color-border-strong)">
                <span className="[font:var(--font-h3)]">
                  {report.type} report —{' '}
                  {report.periodStart.toLocaleDateString()} to{' '}
                  {report.periodEnd.toLocaleDateString()}
                </span>
                <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                  {report.createdAt.toLocaleDateString()}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
