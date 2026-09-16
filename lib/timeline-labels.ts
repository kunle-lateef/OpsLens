import { db } from '@/lib/db';
import type { OperationalEvent } from '@prisma/client';

// Resolves each event's real entityId into a short, human-readable label
// (a customer name, an order reference, a supplier name...) — see the
// developer-approved Timeline audit fix: a repeated event *type*
// ("complaint created") told nothing about whether it was the same
// customer three times or three different ones, which is the one thing
// worth knowing. Batches one query per distinct entityType actually
// present in the given events, not one query per event.
//
// Not every OperationalEvent.type resolves to a label — an entityType not
// listed below (or a row that's since been deleted) simply renders with no
// label, never a guess. OperationalEvent.type is an open, extensible
// vocabulary (see db-migration-runner/SKILL.md); add a branch here for a
// new type only once it actually needs a label.
export async function resolveEventLabels(
  events: Pick<OperationalEvent, 'id' | 'entityType' | 'entityId'>[],
): Promise<Map<string, string>> {
  const idsByType = new Map<string, Set<string>>();
  for (const event of events) {
    const set = idsByType.get(event.entityType) ?? new Set<string>();
    set.add(event.entityId);
    idsByType.set(event.entityType, set);
  }

  // entityType -> (entityId -> label)
  const labelsByType = new Map<string, Map<string, string>>();

  const complaintIds = idsByType.get('Complaint');
  if (complaintIds) {
    const rows = await db.complaint.findMany({
      where: { id: { in: [...complaintIds] } },
      include: { customer: { select: { name: true } } },
    });
    labelsByType.set(
      'Complaint',
      new Map(rows.map((row) => [row.id, row.customer.name])),
    );
  }

  const deliveryIds = idsByType.get('Delivery');
  if (deliveryIds) {
    const rows = await db.delivery.findMany({
      where: { id: { in: [...deliveryIds] } },
      include: { order: { select: { externalId: true } } },
    });
    labelsByType.set(
      'Delivery',
      new Map(
        rows.map((row) => [
          row.id,
          `Order #${row.order.externalId ?? row.orderId.slice(0, 8)}`,
        ]),
      ),
    );
  }

  const invoiceIds = idsByType.get('Invoice');
  if (invoiceIds) {
    const rows = await db.invoice.findMany({
      where: { id: { in: [...invoiceIds] } },
      include: { customer: { select: { name: true } } },
    });
    labelsByType.set(
      'Invoice',
      new Map(rows.map((row) => [row.id, row.customer.name])),
    );
  }

  const supplierIds = idsByType.get('Supplier');
  if (supplierIds) {
    const rows = await db.supplier.findMany({
      where: { id: { in: [...supplierIds] } },
      select: { id: true, name: true },
    });
    labelsByType.set(
      'Supplier',
      new Map(rows.map((row) => [row.id, row.name])),
    );
  }

  const inventoryItemIds = idsByType.get('InventoryItem');
  if (inventoryItemIds) {
    const rows = await db.inventoryItem.findMany({
      where: { id: { in: [...inventoryItemIds] } },
      include: { product: { select: { name: true } } },
    });
    labelsByType.set(
      'InventoryItem',
      new Map(rows.map((row) => [row.id, row.product.name])),
    );
  }

  const warehouseIds = idsByType.get('Warehouse');
  if (warehouseIds) {
    const rows = await db.warehouse.findMany({
      where: { id: { in: [...warehouseIds] } },
      select: { id: true, name: true },
    });
    labelsByType.set(
      'Warehouse',
      new Map(rows.map((row) => [row.id, row.name])),
    );
  }

  const orderIds = idsByType.get('Order');
  if (orderIds) {
    const rows = await db.order.findMany({
      where: { id: { in: [...orderIds] } },
      select: { id: true, externalId: true },
    });
    labelsByType.set(
      'Order',
      new Map(
        rows.map((row) => [
          row.id,
          `Order #${row.externalId ?? row.id.slice(0, 8)}`,
        ]),
      ),
    );
  }

  const eventLabels = new Map<string, string>();
  for (const event of events) {
    const label = labelsByType.get(event.entityType)?.get(event.entityId);
    if (label) eventLabels.set(event.id, label);
  }
  return eventLabels;
}
