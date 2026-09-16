import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { daysAgo } from '@/lib/date-range';
import { findRelatedOpenIssue } from '@/lib/intelligence/related-issue';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/departments/StatCard';
import { RelatedIssueNote } from '@/components/departments/RelatedIssueNote';

const RELATED_KEYWORDS = [
  'delivery',
  'shipping',
  'carrier',
  'dispatch',
  'supplier',
];

export default async function LogisticsDepartmentPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const since = daysAgo(30);

  const [
    totalDeliveries,
    delayedCount,
    failedDeliveries,
    supplierDelays,
    relatedIssue,
  ] = await Promise.all([
    db.delivery.count({
      where: { organizationId, createdAt: { gte: since } },
    }),
    db.operationalEvent.count({
      where: {
        organizationId,
        type: 'DELIVERY_DELAYED',
        timestamp: { gte: since },
      },
    }),
    db.delivery.findMany({
      where: { organizationId, failureReason: { not: null } },
      include: { order: { select: { externalId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.delivery.groupBy({
      by: ['supplierId'],
      where: {
        organizationId,
        supplierId: { not: null },
        createdAt: { gte: since },
      },
      _count: true,
    }),
    findRelatedOpenIssue(organizationId, RELATED_KEYWORDS),
  ]);

  const suppliers = await db.supplier.findMany({
    where: {
      id: { in: supplierDelays.map((s) => s.supplierId!).filter(Boolean) },
    },
  });
  const supplierName = (id: string | null) =>
    suppliers.find((s) => s.id === id)?.name ?? 'Unknown supplier';

  const delayRate =
    totalDeliveries > 0
      ? Math.round((delayedCount / totalDeliveries) * 100)
      : null;

  return (
    <div className="flex flex-col gap-(--space-4)">
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        Delivery performance and supplier reliability over the last 30 days.
      </p>

      <div className="grid grid-cols-1 gap-(--space-3) sm:grid-cols-3">
        <StatCard label="Deliveries (30d)" value={totalDeliveries} />
        <StatCard
          label="Delay rate"
          value={delayRate === null ? 'No data' : `${delayRate}%`}
        />
        <StatCard label="Failed deliveries" value={failedDeliveries.length} />
      </div>

      <RelatedIssueNote issue={relatedIssue} />

      <Card className="flex flex-col gap-(--space-2)">
        <h2 className="[font:var(--font-h3)]">Deliveries by supplier (30d)</h2>
        {supplierDelays.length === 0 ? (
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            No supplier-linked deliveries yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-(--space-1)">
            {supplierDelays.map((row) => (
              <li
                key={row.supplierId}
                className="flex justify-between [font:var(--font-body)]"
              >
                <span>{supplierName(row.supplierId)}</span>
                <span className="text-(--color-text-secondary) tabular-nums">
                  {row._count} deliveries
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {failedDeliveries.length > 0 && (
        <Card className="flex flex-col gap-(--space-2)">
          <h2 className="[font:var(--font-h3)]">Failed deliveries</h2>
          <ul className="flex flex-col gap-(--space-1)">
            {failedDeliveries.map((delivery) => (
              <li
                key={delivery.id}
                className="flex justify-between [font:var(--font-body)]"
              >
                <span>{delivery.order.externalId ?? delivery.orderId}</span>
                <span className="text-(--color-critical) [font:var(--font-caption)]">
                  {delivery.failureReason}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
