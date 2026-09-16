import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/Card';
import { weeklyReportOutputSchema } from '@/lib/ai/schemas';

const SECTIONS: {
  key: keyof ReturnType<typeof weeklyReportOutputSchema.parse>;
  label: string;
  kind: 'fact' | 'prediction';
}[] = [
  { key: 'biggestWins', label: 'Biggest Wins', kind: 'fact' },
  { key: 'biggestRisks', label: 'Biggest Risks', kind: 'fact' },
  { key: 'anomalies', label: 'Anomalies', kind: 'fact' },
  { key: 'predictedRisks', label: 'Predicted Risks', kind: 'prediction' },
  {
    key: 'recommendedPriorities',
    label: 'Recommended Priorities',
    kind: 'prediction',
  },
];

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const session = await getSession();

  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report || report.organizationId !== session!.user.organizationId) {
    notFound();
  }

  const parsed = weeklyReportOutputSchema.safeParse(report.content);
  if (!parsed.success) {
    notFound();
  }
  const content = parsed.data;

  return (
    <div className="flex max-w-2xl flex-col gap-(--space-4)">
      <div>
        <h1 className="[font:var(--font-h1)]">{report.type} Report</h1>
        <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
          {report.periodStart.toLocaleDateString()} –{' '}
          {report.periodEnd.toLocaleDateString()}
        </p>
      </div>

      {/* The report distinguishes historical facts (Wins/Risks/Anomalies) from
          AI interpretation and prediction (Predicted Risks/Recommended
          Priorities) — see the master spec's Weekly AI Operations Report
          section. The "prediction" sections carry a visible label, not just
          a heading, so the distinction survives a quick skim. */}
      {SECTIONS.map((section) => (
        <Card key={section.key} className="flex flex-col gap-(--space-2)">
          <div className="flex items-center justify-between">
            <h2 className="[font:var(--font-h2)]">{section.label}</h2>
            <span
              className="[font:var(--font-caption)]"
              style={{
                color:
                  section.kind === 'prediction'
                    ? 'var(--color-brand-accent)'
                    : 'var(--color-text-tertiary)',
              }}
            >
              {section.kind === 'prediction' ? 'AI prediction' : 'Observed'}
            </span>
          </div>
          {content[section.key].length === 0 ? (
            <p className="text-(--color-text-tertiary) [font:var(--font-body)]">
              Nothing notable this period.
            </p>
          ) : (
            <ul className="flex flex-col gap-(--space-1)">
              {content[section.key].map((item, index) => (
                <li
                  key={index}
                  className="text-(--color-text-secondary) [font:var(--font-body)]"
                >
                  · {item}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
