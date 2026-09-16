// The curated set of entity.field targets a CSV column can map to — see
// section 27 of the product spec ("customer_name -> Customer.name") and
// db-migration-runner/SKILL.md for the underlying schema. Deliberately not
// every field on every entity: this is the subset a single wide
// "orders export" CSV realistically populates for the e-commerce/logistics
// vertical AGENTS.md scopes the MVP to. Extend here, not by inventing a
// mapping ad hoc in the UI.
export type TargetField = {
  entity: string;
  field: string;
  label: string;
  /** Extra header spellings that should match this target deterministically. */
  synonyms: string[];
};

export const TARGET_FIELDS: TargetField[] = [
  {
    entity: 'Customer',
    field: 'externalId',
    label: 'Customer ID',
    synonyms: ['customer_id', 'customerid'],
  },
  {
    entity: 'Customer',
    field: 'name',
    label: 'Customer name',
    synonyms: ['customer_name', 'client_name'],
  },
  {
    entity: 'Customer',
    field: 'email',
    label: 'Customer email',
    synonyms: ['customer_email'],
  },
  {
    entity: 'Customer',
    field: 'phone',
    label: 'Customer phone',
    synonyms: ['customer_phone', 'phone_number'],
  },
  {
    entity: 'Customer',
    field: 'location',
    label: 'Customer location',
    synonyms: ['customer_location', 'city', 'region'],
  },

  {
    entity: 'Order',
    field: 'externalId',
    label: 'Order ID',
    synonyms: ['order_id', 'orderid', 'order_number'],
  },
  {
    entity: 'Order',
    field: 'status',
    label: 'Order status',
    synonyms: ['order_status'],
  },
  {
    entity: 'Order',
    field: 'totalAmount',
    label: 'Order total',
    synonyms: ['total_amount', 'order_total', 'amount'],
  },
  { entity: 'Order', field: 'currency', label: 'Currency', synonyms: [] },
  {
    entity: 'Order',
    field: 'orderedAt',
    label: 'Order date',
    synonyms: ['order_date', 'ordered_at', 'date_ordered'],
  },
  {
    entity: 'Order',
    field: 'expectedDeliveryAt',
    label: 'Expected delivery date',
    synonyms: ['expected_delivery_date', 'expected_delivery', 'eta'],
  },

  {
    entity: 'Warehouse',
    field: 'name',
    label: 'Warehouse',
    synonyms: ['warehouse_name', 'fulfillment_center'],
  },

  {
    entity: 'Supplier',
    field: 'name',
    label: 'Supplier',
    synonyms: ['supplier_name', 'vendor', 'vendor_name'],
  },

  {
    entity: 'Delivery',
    field: 'status',
    label: 'Delivery status',
    synonyms: ['delivery_status', 'shipment_status'],
  },
  {
    entity: 'Delivery',
    field: 'carrier',
    label: 'Carrier',
    synonyms: ['shipping_carrier'],
  },
  {
    entity: 'Delivery',
    field: 'dispatchedAt',
    label: 'Dispatched date',
    synonyms: ['dispatched_at', 'dispatch_date', 'shipped_date'],
  },
  {
    entity: 'Delivery',
    field: 'deliveredAt',
    label: 'Delivered date',
    synonyms: ['delivery_date', 'delivered_at', 'date_delivered'],
  },
  {
    entity: 'Delivery',
    field: 'failureReason',
    label: 'Delivery failure reason',
    synonyms: ['failure_reason'],
  },

  {
    entity: 'Invoice',
    field: 'amount',
    label: 'Invoice amount',
    synonyms: ['invoice_amount'],
  },
  {
    entity: 'Invoice',
    field: 'status',
    label: 'Invoice status',
    synonyms: ['invoice_status', 'payment_status'],
  },
  {
    entity: 'Invoice',
    field: 'dueAt',
    label: 'Invoice due date',
    synonyms: ['due_date', 'invoice_due_date'],
  },
  {
    entity: 'Invoice',
    field: 'paidAt',
    label: 'Invoice paid date',
    synonyms: ['paid_date', 'payment_date'],
  },

  {
    entity: 'Complaint',
    field: 'category',
    label: 'Complaint category',
    synonyms: ['complaint_category'],
  },
  {
    entity: 'Complaint',
    field: 'severity',
    label: 'Complaint severity',
    synonyms: ['complaint_severity'],
  },
  {
    entity: 'Complaint',
    field: 'description',
    label: 'Complaint description',
    synonyms: ['complaint', 'complaint_description', 'complaint_notes'],
  },
];

export function targetKey(entity: string, field: string) {
  return `${entity}.${field}`;
}
