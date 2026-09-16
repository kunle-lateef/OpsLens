import { describe, expect, it } from 'vitest';
import {
  planNormalization,
  collectLookupKeys,
  type ExistingLookups,
} from './normalize';

const ORG = 'org-1';
const IMPORT_ID = 'import-1';
const NOW = new Date('2026-01-15T00:00:00Z');

function emptyLookups(): ExistingLookups {
  return {
    customerIdByExternalId: new Map(),
    customerIdByEmail: new Map(),
    warehouseIdByName: new Map(),
    supplierIdByName: new Map(),
    orderIdByExternalId: new Map(),
  };
}

function idGenerator() {
  let n = 0;
  return () => `id-${++n}`;
}

const CUSTOMER_MAPPING = {
  entity: 'Customer',
  field: 'externalId',
  sourceField: 'customer_id',
};
const CUSTOMER_EMAIL_MAPPING = {
  entity: 'Customer',
  field: 'email',
  sourceField: 'email',
};
const CUSTOMER_NAME_MAPPING = {
  entity: 'Customer',
  field: 'name',
  sourceField: 'name',
};
const ORDER_ID_MAPPING = {
  entity: 'Order',
  field: 'externalId',
  sourceField: 'order_id',
};
const ORDER_STATUS_MAPPING = {
  entity: 'Order',
  field: 'status',
  sourceField: 'status',
};
const ORDER_EXPECTED_MAPPING = {
  entity: 'Order',
  field: 'expectedDeliveryAt',
  sourceField: 'expected_delivery',
};
const WAREHOUSE_MAPPING = {
  entity: 'Warehouse',
  field: 'name',
  sourceField: 'warehouse',
};
const SUPPLIER_MAPPING = {
  entity: 'Supplier',
  field: 'name',
  sourceField: 'supplier',
};
const DELIVERY_DELIVERED_MAPPING = {
  entity: 'Delivery',
  field: 'deliveredAt',
  sourceField: 'delivered_at',
};
const INVOICE_AMOUNT_MAPPING = {
  entity: 'Invoice',
  field: 'amount',
  sourceField: 'invoice_amount',
};
const INVOICE_DUE_MAPPING = {
  entity: 'Invoice',
  field: 'dueAt',
  sourceField: 'due_at',
};
const INVOICE_PAID_MAPPING = {
  entity: 'Invoice',
  field: 'paidAt',
  sourceField: 'paid_at',
};
const COMPLAINT_DESC_MAPPING = {
  entity: 'Complaint',
  field: 'description',
  sourceField: 'complaint',
};

describe('collectLookupKeys', () => {
  it('collects distinct keys across rows, ignoring blanks', () => {
    const rows = [
      { customer_id: 'C1', order_id: 'O1' },
      { customer_id: 'C1', order_id: 'O2' },
      { customer_id: 'C2', order_id: '' },
    ];
    const keys = collectLookupKeys(rows, [CUSTOMER_MAPPING, ORDER_ID_MAPPING]);
    expect(keys.customerExternalIds).toEqual(['C1', 'C2']);
    expect(keys.orderExternalIds).toEqual(['O1', 'O2']);
  });
});

describe('planNormalization — customer resolution', () => {
  it('creates one customer and reuses it for repeated rows with the same externalId', () => {
    const rows = [
      { customer_id: 'C1', order_id: 'O1' },
      { customer_id: 'C1', order_id: 'O2' },
    ];
    const plan = planNormalization(
      rows,
      [CUSTOMER_MAPPING, ORDER_ID_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.customersToCreate).toHaveLength(1);
    expect(plan.ordersToCreate).toHaveLength(2);
    expect(plan.ordersToCreate[0].customerId).toBe(
      plan.ordersToCreate[1].customerId,
    );
  });

  it('matches an existing customer by externalId instead of creating a new one', () => {
    const existing = emptyLookups();
    existing.customerIdByExternalId.set('C1', 'existing-customer-id');
    const rows = [{ customer_id: 'C1', order_id: 'O1' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_MAPPING, ORDER_ID_MAPPING],
      ORG,
      IMPORT_ID,
      existing,
      NOW,
      idGenerator(),
    );
    expect(plan.customersToCreate).toHaveLength(0);
    expect(plan.ordersToCreate[0].customerId).toBe('existing-customer-id');
  });

  it('matches an existing customer by email when no externalId is mapped', () => {
    const existing = emptyLookups();
    existing.customerIdByEmail.set('a@example.com', 'existing-customer-id');
    const rows = [{ email: 'a@example.com', order_id: 'O1' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_EMAIL_MAPPING, ORDER_ID_MAPPING],
      ORG,
      IMPORT_ID,
      existing,
      NOW,
      idGenerator(),
    );
    expect(plan.customersToCreate).toHaveLength(0);
    expect(plan.ordersToCreate[0].customerId).toBe('existing-customer-id');
  });

  it('never matches a name-only customer against existing lookups, even by coincidence', () => {
    const existing = emptyLookups();
    // Nothing keyed by name in ExistingLookups on purpose — a name-only
    // customer can only ever be matched within the same CSV run, never
    // against the database, matching the original per-row behavior this
    // was rewritten from.
    const rows = [{ name: 'Alice' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING],
      ORG,
      IMPORT_ID,
      existing,
      NOW,
      idGenerator(),
    );
    expect(plan.customersToCreate).toHaveLength(1);
    expect(plan.customersToCreate[0].name).toBe('Alice');
  });

  it('dedups two name-only rows with the exact same name within one CSV', () => {
    const rows = [{ name: 'Alice' }, { name: 'Alice' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.customersToCreate).toHaveLength(1);
  });

  it('rejects a row with no customer information at all', () => {
    const rows = [{ order_id: 'O1' }];
    const plan = planNormalization(
      rows,
      [ORDER_ID_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.imported).toBe(0);
    expect(plan.rejected).toBe(1);
    expect(plan.errors[0]).toMatch(/no customer information mapped/);
    expect(plan.ordersToCreate).toHaveLength(0);
  });
});

describe('planNormalization — warehouse and supplier resolution', () => {
  it('creates a warehouse once and reuses it across rows', () => {
    const rows = [
      { name: 'Alice', warehouse: 'West DC' },
      { name: 'Bob', warehouse: 'West DC' },
    ];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, WAREHOUSE_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.warehousesToCreate).toHaveLength(1);
    expect(plan.ordersToCreate[0].warehouseId).toBe(
      plan.ordersToCreate[1].warehouseId,
    );
  });

  it('matches an existing supplier by name instead of creating a new one', () => {
    const existing = emptyLookups();
    existing.supplierIdByName.set('Acme', 'existing-supplier-id');
    const rows = [{ name: 'Alice', supplier: 'Acme' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, SUPPLIER_MAPPING],
      ORG,
      IMPORT_ID,
      existing,
      NOW,
      idGenerator(),
    );
    expect(plan.suppliersToCreate).toHaveLength(0);
    expect(plan.ordersToCreate[0].supplierId).toBe('existing-supplier-id');
  });
});

describe('planNormalization — order upsert-by-externalId semantics', () => {
  it('plans a new order when the externalId does not already exist', () => {
    const rows = [{ name: 'Alice', order_id: 'O1' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, ORDER_ID_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.ordersToCreate).toHaveLength(1);
    expect(plan.ordersToUpdate).toHaveLength(0);
  });

  it('plans an update, not a create, when the externalId already exists', () => {
    const existing = emptyLookups();
    existing.orderIdByExternalId.set('O1', 'existing-order-id');
    const rows = [{ name: 'Alice', order_id: 'O1', status: 'shipped' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, ORDER_ID_MAPPING, ORDER_STATUS_MAPPING],
      ORG,
      IMPORT_ID,
      existing,
      NOW,
      idGenerator(),
    );
    expect(plan.ordersToCreate).toHaveLength(0);
    expect(plan.ordersToUpdate).toEqual([
      {
        id: 'existing-order-id',
        data: expect.objectContaining({ status: 'shipped' }),
      },
    ]);
  });

  it('collapses a repeated new externalId within one CSV into a single create, last row winning', () => {
    const rows = [
      { name: 'Alice', order_id: 'O1', status: 'pending' },
      { name: 'Alice', order_id: 'O1', status: 'shipped' },
    ];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, ORDER_ID_MAPPING, ORDER_STATUS_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.ordersToCreate).toHaveLength(1);
    expect(plan.ordersToCreate[0].status).toBe('shipped');
  });

  it('collapses a repeated existing externalId within one CSV into a single update, last row winning', () => {
    const existing = emptyLookups();
    existing.orderIdByExternalId.set('O1', 'existing-order-id');
    const rows = [
      { name: 'Alice', order_id: 'O1', status: 'pending' },
      { name: 'Alice', order_id: 'O1', status: 'delivered' },
    ];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, ORDER_ID_MAPPING, ORDER_STATUS_MAPPING],
      ORG,
      IMPORT_ID,
      existing,
      NOW,
      idGenerator(),
    );
    expect(plan.ordersToUpdate).toHaveLength(1);
    expect(plan.ordersToUpdate[0].data.status).toBe('delivered');
  });

  it('never dedups orders without an externalId, even with identical fields', () => {
    const rows = [
      { name: 'Alice', status: 'pending' },
      { name: 'Alice', status: 'pending' },
    ];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, ORDER_STATUS_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.ordersToCreate).toHaveLength(2);
  });
});

describe('planNormalization — derived operational events', () => {
  it('emits DELIVERY_DELAYED when delivered after the expected date', () => {
    const rows = [
      {
        name: 'Alice',
        expected_delivery: '2026-01-01',
        delivered_at: '2026-01-10',
      },
    ];
    const plan = planNormalization(
      rows,
      [
        CUSTOMER_NAME_MAPPING,
        ORDER_EXPECTED_MAPPING,
        DELIVERY_DELIVERED_MAPPING,
      ],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.eventsToCreate).toHaveLength(1);
    expect(plan.eventsToCreate[0].type).toBe('DELIVERY_DELAYED');
    expect(plan.eventsToCreate[0].groupKey).toBe(
      `order:${plan.ordersToCreate[0].id}`,
    );
  });

  it('emits no event when delivered on or before the expected date', () => {
    const rows = [
      {
        name: 'Alice',
        expected_delivery: '2026-01-10',
        delivered_at: '2026-01-05',
      },
    ];
    const plan = planNormalization(
      rows,
      [
        CUSTOMER_NAME_MAPPING,
        ORDER_EXPECTED_MAPPING,
        DELIVERY_DELIVERED_MAPPING,
      ],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.eventsToCreate).toHaveLength(0);
  });

  it('emits ORDER_CANCELLED when the order status mentions cancellation', () => {
    const rows = [{ name: 'Alice', status: 'Cancelled by customer' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, ORDER_STATUS_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.eventsToCreate).toHaveLength(1);
    expect(plan.eventsToCreate[0].type).toBe('ORDER_CANCELLED');
    expect(plan.eventsToCreate[0].groupKey).toBe(
      `order:${plan.ordersToCreate[0].id}`,
    );
  });

  it('emits INVOICE_OVERDUE when past due and unpaid, but not when paid', () => {
    const overdueRows = [
      { name: 'Alice', invoice_amount: '100', due_at: '2026-01-01' },
    ];
    const overduePlan = planNormalization(
      overdueRows,
      [CUSTOMER_NAME_MAPPING, INVOICE_AMOUNT_MAPPING, INVOICE_DUE_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(overduePlan.eventsToCreate).toHaveLength(1);
    expect(overduePlan.eventsToCreate[0].type).toBe('INVOICE_OVERDUE');
    expect(overduePlan.eventsToCreate[0].value).toBe(100);
    // Invoice has no orderId in this schema — grouped by customer, not order.
    expect(overduePlan.eventsToCreate[0].groupKey).toBe(
      `customer:${overduePlan.customersToCreate[0].id}`,
    );

    const paidRows = [
      {
        name: 'Alice',
        invoice_amount: '100',
        due_at: '2026-01-01',
        paid_at: '2026-01-01',
      },
    ];
    const paidPlan = planNormalization(
      paidRows,
      [
        CUSTOMER_NAME_MAPPING,
        INVOICE_AMOUNT_MAPPING,
        INVOICE_DUE_MAPPING,
        INVOICE_PAID_MAPPING,
      ],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(paidPlan.eventsToCreate).toHaveLength(0);
  });

  it('always emits COMPLAINT_CREATED for a row with complaint content', () => {
    const rows = [{ name: 'Alice', complaint: 'Package arrived damaged' }];
    const plan = planNormalization(
      rows,
      [CUSTOMER_NAME_MAPPING, COMPLAINT_DESC_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.complaintsToCreate).toHaveLength(1);
    expect(plan.eventsToCreate).toHaveLength(1);
    expect(plan.eventsToCreate[0].type).toBe('COMPLAINT_CREATED');
    expect(plan.eventsToCreate[0].timestamp).toEqual(NOW);
    expect(plan.eventsToCreate[0].groupKey).toBe(
      `order:${plan.ordersToCreate[0].id}`,
    );
  });

  it('gives a delivery-delay event and a complaint on the same order the same groupKey', () => {
    // The actual property Timeline's chain view depends on: two different
    // event types, same underlying order, must resolve to one shared key —
    // not two events that merely happen to be close in time.
    const rows = [
      {
        name: 'Alice',
        order_id: 'O1',
        expected_delivery: '2026-01-01',
        delivered_at: '2026-01-10',
        complaint: 'Package arrived damaged',
      },
    ];
    const plan = planNormalization(
      rows,
      [
        CUSTOMER_NAME_MAPPING,
        ORDER_ID_MAPPING,
        ORDER_EXPECTED_MAPPING,
        DELIVERY_DELIVERED_MAPPING,
        COMPLAINT_DESC_MAPPING,
      ],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.eventsToCreate).toHaveLength(2);
    const groupKeys = new Set(plan.eventsToCreate.map((e) => e.groupKey));
    expect(groupKeys.size).toBe(1);
    expect([...groupKeys][0]).toBe(`order:${plan.ordersToCreate[0].id}`);
  });
});

describe('planNormalization — counts', () => {
  it('counts imported and rejected rows independently, with valid rows unaffected by an earlier rejection', () => {
    const rows: Record<string, string>[] = [
      { order_id: 'O1' }, // no customer info — rejected
      { name: 'Alice', order_id: 'O2' }, // valid
    ];
    const plan = planNormalization(
      rows,
      [ORDER_ID_MAPPING, CUSTOMER_NAME_MAPPING],
      ORG,
      IMPORT_ID,
      emptyLookups(),
      NOW,
      idGenerator(),
    );
    expect(plan.imported).toBe(1);
    expect(plan.rejected).toBe(1);
    expect(plan.ordersToCreate).toHaveLength(1);
  });
});
