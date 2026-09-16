import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { findRelatedOpenIssue } from '@/lib/intelligence/related-issue';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/departments/StatCard';
import { RelatedIssueNote } from '@/components/departments/RelatedIssueNote';

const RELATED_KEYWORDS = ['inventory', 'stock', 'warehouse'];

export default async function InventoryDepartmentPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const [items, relatedIssue] = await Promise.all([
    db.inventoryItem.findMany({
      where: { organizationId },
      include: {
        product: { select: { name: true } },
        warehouse: { select: { name: true } },
      },
    }),
    findRelatedOpenIssue(organizationId, RELATED_KEYWORDS),
  ]);

  const lowStock = items.filter(
    (item) =>
      item.reorderThreshold !== null && item.quantity <= item.reorderThreshold,
  );
  const overstock = items.filter(
    (item) =>
      item.reorderThreshold !== null &&
      item.quantity > item.reorderThreshold * 5,
  );

  return (
    <div className="flex flex-col gap-(--space-4)">
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        Current stock levels against each item&apos;s reorder threshold, as of
        today.
      </p>

      <div className="grid grid-cols-1 gap-(--space-3) sm:grid-cols-3">
        <StatCard label="Tracked items" value={items.length} />
        <StatCard label="Low stock" value={lowStock.length} />
        <StatCard label="Possible overstock" value={overstock.length} />
      </div>

      <RelatedIssueNote issue={relatedIssue} />

      <Card className="flex flex-col gap-(--space-2)">
        <h2 className="[font:var(--font-h3)]">Low-stock items</h2>
        {lowStock.length === 0 ? (
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            {items.length === 0
              ? 'No inventory data yet.'
              : 'Nothing is at or below its reorder threshold right now.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-(--space-2)">
            {lowStock.map((item) => (
              <li
                key={item.id}
                className="flex justify-between [font:var(--font-body)]"
              >
                <span>
                  {item.product.name} — {item.warehouse.name}
                </span>
                <span className="text-(--color-critical) tabular-nums">
                  {item.quantity} / {item.reorderThreshold} threshold
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
