import { notFound } from 'next/navigation';
import { Loader2 } from '@/components/ui/icons';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { DATA_IMPORT_STAGE_LABEL } from '@/lib/data-import-labels';
import { Card } from '@/components/ui/Card';
import { MappingReviewForm } from '@/components/data/MappingReviewForm';
import { StatusPoller } from '@/components/data/StatusPoller';

const ACTIVE_STATUSES = new Set(['Validating', 'Processing']);

export default async function DataImportDetailPage({
  params,
}: {
  params: Promise<{ importId: string }>;
}) {
  const { importId } = await params;
  const session = await getSession();

  const dataImport = await db.dataImport.findUnique({
    where: { id: importId },
  });
  if (
    !dataImport ||
    dataImport.organizationId !== session!.user.organizationId
  ) {
    notFound();
  }

  const mappings =
    dataImport.status === 'MappingPending'
      ? await db.dataMapping.findMany({
          where: { dataImportId: importId },
          orderBy: { createdAt: 'asc' },
        })
      : [];

  return (
    <div className="flex max-w-2xl flex-col gap-(--space-6)">
      <StatusPoller status={dataImport.status} />

      <div>
        <h1 className="[font:var(--font-h1)]">{dataImport.fileName}</h1>
        <div className="flex items-center gap-(--space-2)">
          {ACTIVE_STATUSES.has(dataImport.status) && (
            <Loader2
              size={14}
              aria-hidden="true"
              className="animate-spin text-(--color-brand-accent) motion-reduce:animate-none"
            />
          )}
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            {DATA_IMPORT_STAGE_LABEL[dataImport.status] ?? dataImport.status}
          </p>
        </div>
      </div>

      {dataImport.status === 'MappingPending' && (
        <Card>
          <MappingReviewForm dataImportId={dataImport.id} mappings={mappings} />
        </Card>
      )}

      {(dataImport.status === 'Completed' ||
        dataImport.status === 'PartiallyCompleted') && (
        <Card className="flex flex-col gap-(--space-2)">
          <div className="flex justify-between [font:var(--font-body)]">
            <span className="text-(--color-text-secondary)">Rows detected</span>
            <span>{dataImport.recordsDetected ?? 0}</span>
          </div>
          <div className="flex justify-between [font:var(--font-body)]">
            <span className="text-(--color-text-secondary)">Rows imported</span>
            <span>{dataImport.recordsImported ?? 0}</span>
          </div>
          <div className="flex justify-between [font:var(--font-body)]">
            <span className="text-(--color-text-secondary)">Rows rejected</span>
            <span>{dataImport.recordsRejected ?? 0}</span>
          </div>
          <div className="flex justify-between [font:var(--font-body)]">
            <span className="text-(--color-text-secondary)">Data quality</span>
            <span>
              {dataImport.qualityScore !== null
                ? `${Math.round(dataImport.qualityScore * 100)}%`
                : '—'}
            </span>
          </div>
          {dataImport.errorSummary && (
            <div className="mt-(--space-2) rounded-(--radius-md) bg-(--color-brand-tint-subtle) p-(--space-3) text-(--color-text-secondary) [font:var(--font-caption)]">
              <p className="mb-(--space-1) text-(--color-text-primary) [font:var(--font-label)]">
                Some rows were skipped:
              </p>
              <pre className="whitespace-pre-wrap">
                {dataImport.errorSummary}
              </pre>
            </div>
          )}
        </Card>
      )}

      {dataImport.status === 'Failed' && (
        <Card>
          <p className="text-(--color-critical) [font:var(--font-body)]">
            {dataImport.errorSummary ?? 'This import could not be processed.'}
          </p>
        </Card>
      )}
    </div>
  );
}
