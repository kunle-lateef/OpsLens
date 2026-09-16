import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { findRelatedOpenIssue } from '@/lib/intelligence/related-issue';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/departments/StatCard';
import { RelatedIssueNote } from '@/components/departments/RelatedIssueNote';

const RELATED_KEYWORDS = ['invoice', 'overdue', 'payment'];

export default async function FinanceDepartmentPage() {
  const session = await getSession();
  const organizationId = session!.user.organizationId;

  const [overdueInvoices, allInvoices, riskyCustomers, relatedIssue] =
    await Promise.all([
      db.invoice.findMany({
        where: { organizationId, status: 'overdue' },
        include: { customer: { select: { name: true } } },
        orderBy: { dueAt: 'asc' },
        take: 20,
      }),
      db.invoice.findMany({
        where: { organizationId },
        select: { amount: true, status: true },
      }),
      db.invoice.groupBy({
        by: ['customerId'],
        where: { organizationId, status: 'overdue' },
        _count: true,
        having: { customerId: { _count: { gt: 1 } } },
        orderBy: { _count: { customerId: 'desc' } },
        take: 5,
      }),
      findRelatedOpenIssue(organizationId, RELATED_KEYWORDS),
    ]);

  const overdueTotal = overdueInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0,
  );
  const totalInvoiced = allInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0,
  );

  const riskyCustomerDetails = await db.customer.findMany({
    where: { id: { in: riskyCustomers.map((r) => r.customerId) } },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-(--space-4)">
      <p className="text-(--color-text-secondary) [font:var(--font-body)]">
        Outstanding invoices and payment risk across your customer base, all
        time.
      </p>

      <div className="grid grid-cols-1 gap-(--space-3) sm:grid-cols-3">
        <StatCard label="Outstanding invoices" value={overdueInvoices.length} />
        <StatCard
          label="Overdue amount"
          value={`$${overdueTotal.toLocaleString()}`}
        />
        <StatCard
          label="Total invoiced"
          value={`$${totalInvoiced.toLocaleString()}`}
        />
      </div>

      <RelatedIssueNote issue={relatedIssue} />

      {riskyCustomerDetails.length > 0 && (
        <Card className="flex flex-col gap-(--space-2)">
          <h2 className="[font:var(--font-h3)]">High-risk customers</h2>
          <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
            More than one overdue invoice
          </p>
          <ul className="flex flex-col gap-(--space-1)">
            {riskyCustomerDetails.map((customer) => (
              <li key={customer.id} className="[font:var(--font-body)]">
                {customer.name}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col gap-(--space-2)">
        <h2 className="[font:var(--font-h3)]">Outstanding invoices</h2>
        {overdueInvoices.length === 0 ? (
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            No overdue invoices right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-(--space-2)">
            {overdueInvoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex justify-between [font:var(--font-body)]"
              >
                <span>{invoice.customer.name}</span>
                <span className="text-(--color-critical) tabular-nums">
                  ${Number(invoice.amount).toLocaleString()} · due{' '}
                  {invoice.dueAt?.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
