import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/Card';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { EventChain } from '@/components/timeline/EventChain';
import { resolveEventLabels } from '@/lib/timeline-labels';

const SEVERITY_LABELS = new Set([
  'Critical',
  'High',
  'Medium',
  'Low',
  'Informational',
]);

function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Operational event history — see the master spec's Timeline Intelligence
// section. Helps a user understand relationships between events across
// time (the same events that feed the intelligence pipeline — see
// architecture.md's central OperationalEvent entity), grouped by day.
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getSession();
  const organizationId = session!.user.organizationId;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const pageSize = 50;

  const [events, totalCount] = await Promise.all([
    db.operationalEvent.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.operationalEvent.count({ where: { organizationId } }),
  ]);

  // Chains: events sharing a real groupKey (see db-migration-runner/SKILL.md's
  // OperationalEvent.groupKey note) — never events that just happen to be
  // close in time. A group of exactly one event isn't a chain; it stays in
  // the day-grouped list below like any other event.
  const byGroupKey = new Map<string, typeof events>();
  for (const event of events) {
    if (!event.groupKey) continue;
    const group = byGroupKey.get(event.groupKey) ?? [];
    group.push(event);
    byGroupKey.set(event.groupKey, group);
  }
  const chainEntries = [...byGroupKey.entries()].filter(
    ([, group]) => group.length >= 2,
  );
  const chainedEventIds = new Set(
    chainEntries.flatMap(([, group]) => group.map((e) => e.id)),
  );
  const singletonEvents = events.filter((e) => !chainedEventIds.has(e.id));

  const orderIds = chainEntries
    .map(([key]) => key)
    .filter((key) => key.startsWith('order:'))
    .map((key) => key.slice('order:'.length));
  const customerIds = chainEntries
    .map(([key]) => key)
    .filter((key) => key.startsWith('customer:'))
    .map((key) => key.slice('customer:'.length));

  const [orders, customers] = await Promise.all([
    orderIds.length > 0
      ? db.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, externalId: true },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? db.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const orderLabel = new Map(
    orders.map((o) => [o.id, `Order #${o.externalId ?? o.id.slice(0, 8)}`]),
  );
  const customerLabel = new Map(
    customers.map((c) => [c.id, `${c.name}'s account`]),
  );

  function labelForGroupKey(key: string): string {
    if (key.startsWith('order:')) {
      return orderLabel.get(key.slice('order:'.length)) ?? 'this order';
    }
    return customerLabel.get(key.slice('customer:'.length)) ?? 'this customer';
  }

  const groups = new Map<string, typeof events>();
  for (const event of singletonEvents) {
    const key = event.timestamp.toDateString();
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }

  // Distinguishing detail per row — see the developer-approved audit fix:
  // several same-type events on the same day (e.g. seven "complaint
  // created" rows) previously looked identical even though each traces to
  // a different real customer. Chain events (above) already carry their
  // own "Related to X" label from EventChain, so this only needs to cover
  // the day-grouped singleton list.
  const eventLabels = await resolveEventLabels(singletonEvents);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex max-w-2xl flex-col gap-(--space-6)">
      <div>
        <h1 className="[font:var(--font-h1)]">Timeline</h1>
        <p className="text-(--color-text-secondary) [font:var(--font-body)]">
          A chronological record of every operational event — orders,
          deliveries, invoices, and complaints.
          {chainEntries.length > 0 &&
            ' Events that trace back to the same order or customer are grouped together below; everything else is listed individually by day.'}
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <p className="text-(--color-text-secondary) [font:var(--font-body)]">
            No operational events yet. As data comes in, everything OpsLens
            detects will show up here in order.
          </p>
        </Card>
      ) : (
        <>
          {chainEntries.length > 0 && (
            <div className="flex flex-col gap-(--space-2)">
              {chainEntries.map(([key, group]) => (
                <EventChain
                  key={key}
                  label={labelForGroupKey(key)}
                  events={group}
                />
              ))}
            </div>
          )}
          {Array.from(groups.entries()).map(([dayKey, dayEvents]) => (
            <div key={dayKey} className="flex flex-col gap-(--space-2)">
              <h2 className="text-(--color-text-tertiary) [font:var(--font-h3)]">
                {dayLabel(dayEvents[0].timestamp)}
              </h2>
              <div className="flex flex-col gap-(--space-1)">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-(--space-3) rounded-(--radius-md) border border-(--color-border-subtle) px-(--space-3) py-(--space-2)"
                  >
                    <span className="w-16 shrink-0 text-(--color-text-tertiary) tabular-nums [font:var(--font-caption)]">
                      {timeLabel(event.timestamp)}
                    </span>
                    {event.severity && SEVERITY_LABELS.has(event.severity) && (
                      <SeverityBadge
                        severity={
                          event.severity as
                            | 'Critical'
                            | 'High'
                            | 'Medium'
                            | 'Low'
                            | 'Informational'
                        }
                      />
                    )}
                    <span className="text-(--color-text-primary) [font:var(--font-body)]">
                      {event.type.replace(/_/g, ' ').toLowerCase()}
                      {eventLabels.has(event.id) && (
                        <span className="text-(--color-brand-accent)">
                          {' '}
                          — {eventLabels.get(event.id)}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-(--space-2) text-(--color-text-tertiary) [font:var(--font-caption)]">
          Page {page} of {totalPages}
        </div>
      )}
    </div>
  );
}
