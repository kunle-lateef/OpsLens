import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { DATA_IMPORT_STATUS_LABEL } from '@/lib/data-import-labels';
import { Card } from '@/components/ui/Card';
import { UploadCsvForm } from '@/components/data/UploadCsvForm';

export default async function DataPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const imports = await db.dataImport.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div className="flex max-w-5xl flex-col gap-(--space-6)">
      <div className="flex flex-col items-start gap-(--space-4) sm:flex-row sm:justify-between">
        <div>
          <h1 className="[font:var(--font-h1)]">Data</h1>
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            CSV uploads and their processing status.
          </p>
        </div>
        <UploadCsvForm />
      </div>

      {imports.length === 0 ? (
        <Card>
          <h2 className="mb-(--space-2) [font:var(--font-h3)]">
            Your operational intelligence starts here.
          </h2>
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            Upload your first operations dataset and OpsLens will help identify
            trends, anomalies, and issues that require attention. We&apos;ll
            detect the columns, suggest a mapping, and walk you through
            confirming it before anything is imported.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-(--space-2)">
          {imports.map((dataImport) => (
            <Link
              key={dataImport.id}
              href={`/data/${dataImport.id}`}
              className="block rounded-(--radius-lg) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
            >
              <Card className="flex items-center justify-between hover:border-(--color-border-strong)">
                <div className="flex flex-col">
                  <span className="[font:var(--font-h3)]">
                    {dataImport.fileName}
                  </span>
                  <span className="text-(--color-text-tertiary) [font:var(--font-caption)]">
                    {dataImport.createdAt.toLocaleString()}
                  </span>
                </div>
                <span className="text-(--color-text-secondary) [font:var(--font-label)]">
                  {DATA_IMPORT_STATUS_LABEL[dataImport.status] ??
                    dataImport.status}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
