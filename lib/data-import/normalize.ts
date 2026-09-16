// Pure planning logic for turning parsed CSV rows into the normalized
// Customer/Order/Delivery/Invoice/Complaint/OperationalEvent rows the rest
// of the app reads — split out of lib/workflows.ts's normalizeImportedData
// step during the Phase 7 performance pass. This module makes zero DB
// calls, which is the whole point: the previous version did a findFirst
// (and sometimes a create) per row per related entity, meaning a large
// import meant tens of thousands of sequential round-trips inside a single
// Workflow step. Moving all of that DB I/O to a handful of bulk
// queries/writes around this function — instead of inside it — is what
// fixes the performance problem; this function itself is what makes that
// rewrite testable without a live database (see normalize.test.ts).
export type FieldBag = Record<string, string | undefined>;

export function extractFields(
  row: Record<string, string>,
  mappings: { entity: string; field: string; sourceField: string }[],
  entity: string,
): FieldBag {
  const bag: FieldBag = {};
  for (const mapping of mappings) {
    if (mapping.entity === entity) {
      const value = row[mapping.sourceField]?.trim();
      if (value) bag[mapping.field] = value;
    }
  }
  return bag;
}

export function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function toDecimal(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isNaN(num) ? undefined : num;
}

type Mapping = { entity: string; field: string; sourceField: string };

/**
 * The distinct lookup keys the step wrapper needs to bulk-fetch before
 * calling planNormalization — one findMany per entity type instead of one
 * per row. Pure and cheap: just a scan of the already-parsed rows.
 */
export function collectLookupKeys(
  rows: Record<string, string>[],
  mappings: Mapping[],
) {
  const customerExternalIds = new Set<string>();
  const customerEmails = new Set<string>();
  const warehouseNames = new Set<string>();
  const supplierNames = new Set<string>();
  const orderExternalIds = new Set<string>();

  for (const row of rows) {
    const customer = extractFields(row, mappings, 'Customer');
    if (customer.externalId) customerExternalIds.add(customer.externalId);
    if (customer.email) customerEmails.add(customer.email);
    const warehouse = extractFields(row, mappings, 'Warehouse');
    if (warehouse.name) warehouseNames.add(warehouse.name);
    const supplier = extractFields(row, mappings, 'Supplier');
    if (supplier.name) supplierNames.add(supplier.name);
    const order = extractFields(row, mappings, 'Order');
    if (order.externalId) orderExternalIds.add(order.externalId);
  }

  return {
    customerExternalIds: [...customerExternalIds],
    customerEmails: [...customerEmails],
    warehouseNames: [...warehouseNames],
    supplierNames: [...supplierNames],
    orderExternalIds: [...orderExternalIds],
  };
}

/** What already exists in the database, fetched in bulk by the step wrapper before planning. */
export type ExistingLookups = {
  customerIdByExternalId: Map<string, string>;
  customerIdByEmail: Map<string, string>;
  warehouseIdByName: Map<string, string>;
  supplierIdByName: Map<string, string>;
  orderIdByExternalId: Map<string, string>;
};

export type CustomerCreateData = {
  id: string;
  organizationId: string;
  externalId?: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
};

export type WarehouseCreateData = {
  id: string;
  organizationId: string;
  name: string;
};

export type SupplierCreateData = {
  id: string;
  organizationId: string;
  name: string;
};

export type OrderData = {
  organizationId: string;
  externalId?: string;
  customerId: string;
  warehouseId?: string;
  supplierId?: string;
  status: string;
  totalAmount?: number;
  currency?: string;
  orderedAt?: Date;
  expectedDeliveryAt?: Date;
};

export type DeliveryCreateData = {
  id: string;
  organizationId: string;
  orderId: string;
  warehouseId?: string;
  supplierId?: string;
  status: string;
  carrier?: string;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
};

export type InvoiceCreateData = {
  id: string;
  organizationId: string;
  customerId: string;
  amount: number;
  currency?: string;
  dueAt?: Date;
  paidAt?: Date;
  status: string;
};

export type ComplaintCreateData = {
  id: string;
  organizationId: string;
  customerId: string;
  orderId: string;
  category?: string;
  severity?: string;
  description?: string;
  status: string;
  createdAt: Date;
};

export type EventCreateData = {
  id: string;
  organizationId: string;
  type: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  severity: string;
  value?: number;
  sourceId: string;
  // A real, shared foreign key ('order:<id>' or 'customer:<id>'), computed
  // once here from the actual Order/Customer this event is tied to — never
  // inferred later from time proximity or AI text. Timeline's chain view
  // (see app/(dashboard)/timeline/page.tsx) groups strictly on this field,
  // which is the whole reason it exists: grouping by a real shared key is
  // safe, grouping by "happened around the same time" is not — see
  // db-migration-runner/SKILL.md's OperationalEvent.groupKey note.
  groupKey?: string;
};

export type NormalizationPlan = {
  customersToCreate: CustomerCreateData[];
  warehousesToCreate: WarehouseCreateData[];
  suppliersToCreate: SupplierCreateData[];
  ordersToCreate: (OrderData & { id: string })[];
  ordersToUpdate: { id: string; data: OrderData }[];
  deliveriesToCreate: DeliveryCreateData[];
  invoicesToCreate: InvoiceCreateData[];
  complaintsToCreate: ComplaintCreateData[];
  eventsToCreate: EventCreateData[];
  imported: number;
  rejected: number;
  errors: string[];
};

// --- Per-entity resolution/build steps -------------------------------
// Each one below handles exactly one entity's slice of a row: given the
// already-extracted fields for that entity plus whatever context it needs,
// it returns the id to use downstream and/or the record(s) to push into the
// plan — never touching the DB, never touching another entity's concern.
// planNormalization (below) is just the per-row orchestrator that calls
// these in order and collects their output — split out so each one is
// independently readable and testable, the same shape lib/workflows.ts
// already uses for its own pipeline steps.

function resolveCustomer(
  // Precondition, enforced by the caller before this runs: at least one of
  // externalId/email/name is present — see the "no customer information"
  // check in planNormalization. customerKey's `!` below relies on it.
  fields: FieldBag,
  organizationId: string,
  existing: ExistingLookups,
  seen: Map<string, string>,
  generateId: () => string,
): { customerId: string; create?: CustomerCreateData } {
  // A name-only customer (no externalId/email) is never matched against
  // the DB — same as the original per-row `OR: []` clause, which always
  // matches nothing — so it always creates, unless a prior row in this
  // same CSV already created one with the exact same name.
  const customerKey = fields.externalId ?? fields.email ?? fields.name!;
  const seenId = seen.get(customerKey);
  if (seenId) return { customerId: seenId };

  const matchedId =
    (fields.externalId &&
      existing.customerIdByExternalId.get(fields.externalId)) ||
    (fields.email && existing.customerIdByEmail.get(fields.email)) ||
    undefined;

  const customerId = matchedId ?? generateId();
  seen.set(customerKey, customerId);
  if (matchedId) return { customerId };

  return {
    customerId,
    create: {
      id: customerId,
      organizationId,
      externalId: fields.externalId,
      name: fields.name ?? fields.email ?? 'Unknown customer',
      email: fields.email,
      phone: fields.phone,
      location: fields.location,
    },
  };
}

// Warehouse and Supplier resolve identically — a plain named lookup that
// creates on first sight and reuses thereafter, both by shape
// ({id, organizationId, name}) and by behavior — one function for both.
function resolveNamedEntity(
  name: string | undefined,
  organizationId: string,
  existingIdByName: Map<string, string>,
  seen: Map<string, string>,
  generateId: () => string,
): { id?: string; create?: { id: string; organizationId: string; name: string } } {
  if (!name) return {};
  const seenId = seen.get(name);
  if (seenId) return { id: seenId };

  const matchedId = existingIdByName.get(name);
  const id = matchedId ?? generateId();
  seen.set(name, id);
  if (matchedId) return { id };

  return { id, create: { id, organizationId, name } };
}

/**
 * Resolves the id an Order's fields should be written under, applying the
 * same last-row-wins semantics a repeated db.order.upsert() would have —
 * see planNormalization's own doc comment. Mutates the two pending maps in
 * place (rather than returning yet another object for the caller to merge)
 * since "record this order's latest data under its id" is exactly this
 * function's one job.
 */
function resolveOrder(
  orderData: OrderData,
  seenByExternalId: Map<string, string>,
  pendingNewOrders: Map<string, OrderData & { id: string }>,
  pendingOrderUpdates: Map<string, OrderData>,
  existingOrderIdByExternalId: Map<string, string>,
  generateId: () => string,
): string {
  const externalId = orderData.externalId;
  if (!externalId) {
    const orderId = generateId();
    pendingNewOrders.set(orderId, { ...orderData, id: orderId });
    return orderId;
  }

  const seenId = seenByExternalId.get(externalId);
  if (seenId) {
    if (pendingNewOrders.has(seenId)) {
      pendingNewOrders.set(seenId, { ...orderData, id: seenId });
    } else {
      pendingOrderUpdates.set(seenId, orderData);
    }
    return seenId;
  }

  const existingOrderId = existingOrderIdByExternalId.get(externalId);
  const orderId = existingOrderId ?? generateId();
  if (existingOrderId) {
    pendingOrderUpdates.set(orderId, orderData);
  } else {
    pendingNewOrders.set(orderId, { ...orderData, id: orderId });
  }
  seenByExternalId.set(externalId, orderId);
  return orderId;
}

function buildDelivery(
  fields: FieldBag,
  ctx: {
    organizationId: string;
    orderId: string;
    warehouseId?: string;
    supplierId?: string;
    expectedDeliveryAt?: Date;
    dataImportId: string;
  },
  generateId: () => string,
): { delivery?: DeliveryCreateData; event?: EventCreateData } {
  if (Object.keys(fields).length === 0) return {};

  const deliveryId = generateId();
  const deliveredAt = toDate(fields.deliveredAt);
  const delivery: DeliveryCreateData = {
    id: deliveryId,
    organizationId: ctx.organizationId,
    orderId: ctx.orderId,
    warehouseId: ctx.warehouseId,
    supplierId: ctx.supplierId,
    status: fields.status ?? 'unknown',
    carrier: fields.carrier,
    dispatchedAt: toDate(fields.dispatchedAt),
    deliveredAt,
    failureReason: fields.failureReason,
  };

  if (
    !ctx.expectedDeliveryAt ||
    !deliveredAt ||
    deliveredAt <= ctx.expectedDeliveryAt
  ) {
    return { delivery };
  }

  return {
    delivery,
    event: {
      id: generateId(),
      organizationId: ctx.organizationId,
      type: 'DELIVERY_DELAYED',
      entityType: 'Delivery',
      entityId: deliveryId,
      timestamp: deliveredAt,
      severity: 'High',
      sourceId: ctx.dataImportId,
      groupKey: `order:${ctx.orderId}`,
    },
  };
}

function buildOrderCancelledEvent(
  fields: FieldBag,
  ctx: {
    organizationId: string;
    orderId: string;
    orderedAt?: Date;
    now: Date;
    dataImportId: string;
  },
  generateId: () => string,
): EventCreateData | undefined {
  if (!fields.status || !/cancel/i.test(fields.status)) return undefined;

  return {
    id: generateId(),
    organizationId: ctx.organizationId,
    type: 'ORDER_CANCELLED',
    entityType: 'Order',
    entityId: ctx.orderId,
    timestamp: ctx.orderedAt ?? ctx.now,
    severity: 'Medium',
    sourceId: ctx.dataImportId,
    groupKey: `order:${ctx.orderId}`,
  };
}

function buildInvoice(
  fields: FieldBag,
  ctx: {
    organizationId: string;
    customerId: string;
    now: Date;
    dataImportId: string;
  },
  generateId: () => string,
): { invoice?: InvoiceCreateData; event?: EventCreateData } {
  if (Object.keys(fields).length === 0 || !fields.amount) return {};

  const invoiceId = generateId();
  const dueAt = toDate(fields.dueAt);
  const paidAt = toDate(fields.paidAt);
  const amount = toDecimal(fields.amount) ?? 0;
  const invoice: InvoiceCreateData = {
    id: invoiceId,
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
    amount,
    currency: fields.currency,
    dueAt,
    paidAt,
    status: fields.status ?? 'unknown',
  };

  if (!dueAt || dueAt >= ctx.now || paidAt) {
    return { invoice };
  }

  return {
    invoice,
    event: {
      id: generateId(),
      organizationId: ctx.organizationId,
      type: 'INVOICE_OVERDUE',
      entityType: 'Invoice',
      entityId: invoiceId,
      timestamp: dueAt,
      severity: 'High',
      value: amount,
      sourceId: ctx.dataImportId,
      // Invoice has no orderId in this schema — customerId is the only
      // real shared key available for this event type.
      groupKey: `customer:${ctx.customerId}`,
    },
  };
}

function buildComplaint(
  fields: FieldBag,
  ctx: {
    organizationId: string;
    customerId: string;
    orderId: string;
    now: Date;
    dataImportId: string;
  },
  generateId: () => string,
): { complaint?: ComplaintCreateData; event?: EventCreateData } {
  if (!fields.description && !fields.category) return {};

  const complaintId = generateId();
  return {
    // createdAt is set explicitly to `now` (the whole run's shared
    // timestamp) rather than left to the DB default: batched createMany
    // gives no row back to read a DB-generated createdAt from, and the
    // COMPLAINT_CREATED event below needs a timestamp without a
    // round-trip. All complaints from one import sharing one instant is a
    // negligible, documented deviation from the original per-row DB time.
    complaint: {
      id: complaintId,
      organizationId: ctx.organizationId,
      customerId: ctx.customerId,
      orderId: ctx.orderId,
      category: fields.category,
      severity: fields.severity,
      description: fields.description,
      status: 'open',
      createdAt: ctx.now,
    },
    event: {
      id: generateId(),
      organizationId: ctx.organizationId,
      type: 'COMPLAINT_CREATED',
      entityType: 'Complaint',
      entityId: complaintId,
      timestamp: ctx.now,
      severity: fields.severity ?? 'Medium',
      sourceId: ctx.dataImportId,
      groupKey: `order:${ctx.orderId}`,
    },
  };
}

/**
 * Builds the full set of rows to write from already-parsed CSV rows and
 * already-fetched "what exists in the DB" lookups — no DB access here. A
 * repeated externalId within the same CSV is resolved the same way calling
 * db.order.upsert() twice in a row would behave (last row's values win),
 * without needing the entity to actually exist in the DB yet: see
 * resolveOrder's own doc comment.
 *
 * `now` and `generateId` are injected rather than using Date.now()/
 * crypto.randomUUID() directly so this stays a pure function — the step
 * wrapper passes the real implementations, tests pass deterministic ones.
 *
 * The function itself is a thin per-row orchestrator: extract this row's
 * fields per entity, then call each entity's own resolve/build step above
 * and collect what it returns. Each step owns exactly one entity's rules;
 * this loop owns only the order they run in and what happens with their
 * output.
 */
export function planNormalization(
  rows: Record<string, string>[],
  mappings: Mapping[],
  organizationId: string,
  dataImportId: string,
  existing: ExistingLookups,
  now: Date,
  generateId: () => string,
): NormalizationPlan {
  const customersToCreate: CustomerCreateData[] = [];
  const warehousesToCreate: WarehouseCreateData[] = [];
  const suppliersToCreate: SupplierCreateData[] = [];
  const eventsToCreate: EventCreateData[] = [];
  const deliveriesToCreate: DeliveryCreateData[] = [];
  const invoicesToCreate: InvoiceCreateData[] = [];
  const complaintsToCreate: ComplaintCreateData[] = [];

  // Pending new orders, keyed by generated id — mutated in place if a later
  // row repeats the same externalId, then flushed to an array at the end.
  const pendingNewOrders = new Map<string, OrderData & { id: string }>();
  // Pending updates to orders that already exist in the DB — same
  // last-row-wins behavior for a repeated externalId.
  const pendingOrderUpdates = new Map<string, OrderData>();

  const customerIdByKeySeen = new Map<string, string>();
  const warehouseIdByNameSeen = new Map<string, string>();
  const supplierIdByNameSeen = new Map<string, string>();
  const orderIdByExternalIdSeen = new Map<string, string>();

  let imported = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    try {
      const customerFields = extractFields(row, mappings, 'Customer');
      const orderFields = extractFields(row, mappings, 'Order');
      const warehouseFields = extractFields(row, mappings, 'Warehouse');
      const supplierFields = extractFields(row, mappings, 'Supplier');
      const deliveryFields = extractFields(row, mappings, 'Delivery');
      const invoiceFields = extractFields(row, mappings, 'Invoice');
      const complaintFields = extractFields(row, mappings, 'Complaint');

      if (
        !customerFields.name &&
        !customerFields.externalId &&
        !customerFields.email
      ) {
        throw new Error(
          `Row ${index + 1}: no customer information mapped — an Order needs a Customer.`,
        );
      }

      const customer = resolveCustomer(
        customerFields,
        organizationId,
        existing,
        customerIdByKeySeen,
        generateId,
      );
      if (customer.create) customersToCreate.push(customer.create);

      const warehouse = resolveNamedEntity(
        warehouseFields.name,
        organizationId,
        existing.warehouseIdByName,
        warehouseIdByNameSeen,
        generateId,
      );
      if (warehouse.create) warehousesToCreate.push(warehouse.create);

      const supplier = resolveNamedEntity(
        supplierFields.name,
        organizationId,
        existing.supplierIdByName,
        supplierIdByNameSeen,
        generateId,
      );
      if (supplier.create) suppliersToCreate.push(supplier.create);

      const orderData: OrderData = {
        organizationId,
        externalId: orderFields.externalId,
        customerId: customer.customerId,
        warehouseId: warehouse.id,
        supplierId: supplier.id,
        status: orderFields.status ?? 'unknown',
        totalAmount: toDecimal(orderFields.totalAmount),
        currency: orderFields.currency,
        orderedAt: toDate(orderFields.orderedAt),
        expectedDeliveryAt: toDate(orderFields.expectedDeliveryAt),
      };
      const orderId = resolveOrder(
        orderData,
        orderIdByExternalIdSeen,
        pendingNewOrders,
        pendingOrderUpdates,
        existing.orderIdByExternalId,
        generateId,
      );

      const { delivery, event: deliveryEvent } = buildDelivery(
        deliveryFields,
        {
          organizationId,
          orderId,
          warehouseId: warehouse.id,
          supplierId: supplier.id,
          expectedDeliveryAt: orderData.expectedDeliveryAt,
          dataImportId,
        },
        generateId,
      );
      if (delivery) deliveriesToCreate.push(delivery);
      if (deliveryEvent) eventsToCreate.push(deliveryEvent);

      const cancelledEvent = buildOrderCancelledEvent(
        orderFields,
        { organizationId, orderId, orderedAt: orderData.orderedAt, now, dataImportId },
        generateId,
      );
      if (cancelledEvent) eventsToCreate.push(cancelledEvent);

      const { invoice, event: invoiceEvent } = buildInvoice(
        invoiceFields,
        { organizationId, customerId: customer.customerId, now, dataImportId },
        generateId,
      );
      if (invoice) invoicesToCreate.push(invoice);
      if (invoiceEvent) eventsToCreate.push(invoiceEvent);

      const { complaint, event: complaintEvent } = buildComplaint(
        complaintFields,
        {
          organizationId,
          customerId: customer.customerId,
          orderId,
          now,
          dataImportId,
        },
        generateId,
      );
      if (complaint) complaintsToCreate.push(complaint);
      if (complaintEvent) eventsToCreate.push(complaintEvent);

      imported += 1;
    } catch (error) {
      rejected += 1;
      if (errors.length < 20) {
        errors.push(
          error instanceof Error
            ? error.message
            : `Row ${index + 1}: could not be imported.`,
        );
      }
    }
  }

  return {
    customersToCreate,
    warehousesToCreate,
    suppliersToCreate,
    ordersToCreate: [...pendingNewOrders.values()],
    ordersToUpdate: [...pendingOrderUpdates.entries()].map(([id, data]) => ({
      id,
      data,
    })),
    deliveriesToCreate,
    invoicesToCreate,
    complaintsToCreate,
    eventsToCreate,
    imported,
    rejected,
    errors,
  };
}
