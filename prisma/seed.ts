import { PrismaClient, RoleName } from '@prisma/client';
import { hashPassword } from '../lib/password';
import { analyzeOrganization } from '../lib/intelligence/analyze-organization';
import { createMockFixtureIssue } from '../lib/intelligence/create-mock-fixture-issue';

const db = new PrismaClient();

// Coherent fictional demo dataset — see the product spec's "Demo Scenario":
// Supplier A begins responding more slowly -> inventory availability
// decreases -> warehouse backlog increases -> delivery times increase ->
// customer complaints increase. Never use this in a way that suggests it's
// real production data — see AGENTS.md's Non-Negotiables.

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function main() {
  console.log('Seeding demo organization...');

  const organization = await db.organization.create({
    data: {
      name: 'Acme Commerce (Demo)',
      slug: 'acme-commerce-demo',
      industry: 'E-commerce & Logistics',
      timezone: 'UTC',
      usageQuota: 10,
      usageCount: 0,
      billingCycleStart: daysAgo(21),
    },
  });

  const roles = new Map<RoleName, string>();
  for (const name of Object.values(RoleName)) {
    const role = await db.role.create({
      data: { organizationId: organization.id, name, permissions: {} },
    });
    roles.set(name, role.id);
  }

  const demoPassword = 'Demo1234!';
  const user = await db.user.create({
    data: {
      organizationId: organization.id,
      name: 'Sarah Ops',
      email: 'demo@opslens.dev',
      passwordHash: await hashPassword(demoPassword),
      roleId: roles.get(RoleName.Owner)!,
      status: 'active',
    },
  });

  const [centralWarehouse, westWarehouse] = await Promise.all([
    db.warehouse.create({
      data: {
        organizationId: organization.id,
        name: 'Central Warehouse',
        location: 'Lagos',
      },
    }),
    db.warehouse.create({
      data: {
        organizationId: organization.id,
        name: 'West Warehouse',
        location: 'Accra',
      },
    }),
  ]);

  const [supplierA, supplierB] = await Promise.all([
    db.supplier.create({
      data: {
        organizationId: organization.id,
        name: 'Supplier A',
        location: 'Lagos',
      },
    }),
    db.supplier.create({
      data: {
        organizationId: organization.id,
        name: 'Supplier B',
        location: 'Accra',
      },
    }),
  ]);

  const products = await Promise.all(
    ['Wireless Charger', 'Desk Lamp', 'Backpack', 'Water Bottle'].map(
      (name, i) =>
        db.product.create({
          data: {
            organizationId: organization.id,
            name,
            sku: `SKU-${1000 + i}`,
            unitPrice: 15 + i * 10,
          },
        }),
    ),
  );

  const customers = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      db.customer.create({
        data: {
          organizationId: organization.id,
          name: `Customer ${i + 1}`,
          email: `customer${i + 1}@example.com`,
          location: pick(['Lagos', 'Accra', 'Nairobi', 'Abuja']),
        },
      }),
    ),
  );

  console.log('Seeding orders, deliveries, invoices, complaints...');

  let orderCounter = 0;
  let complaintCount = 0;
  let overdueInvoiceTotal = 0;
  const events: {
    type: string;
    entityType: string;
    entityId: string;
    timestamp: Date;
    severity: string;
    value?: number;
  }[] = [];

  // Three weeks: healthy -> Supplier A begins slipping -> visible impact.
  for (let dayOffset = 21; dayOffset >= 0; dayOffset--) {
    const day = daysAgo(dayOffset);
    const week = dayOffset > 14 ? 1 : dayOffset > 7 ? 2 : 3;
    const ordersToday = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < ordersToday; i++) {
      orderCounter += 1;
      const supplier = i % 2 === 0 ? supplierA : supplierB;
      const isSupplierA = supplier.id === supplierA.id;

      // Supplier A's response time — and downstream delivery reliability —
      // degrades starting week 2; Supplier B stays healthy throughout, so
      // the pattern is attributable to one supplier, not a general problem.
      const delayed =
        isSupplierA && week >= 2 && Math.random() < (week === 2 ? 0.35 : 0.75);

      const orderedAt = day;
      const expectedDeliveryAt = new Date(orderedAt.getTime() + 3 * DAY_MS);
      const deliveredAt = delayed
        ? new Date(
            expectedDeliveryAt.getTime() + (1 + Math.random() * 3) * DAY_MS,
          )
        : new Date(expectedDeliveryAt.getTime() - Math.random() * DAY_MS);

      const order = await db.order.create({
        data: {
          organizationId: organization.id,
          externalId: `ORD-${1000 + orderCounter}`,
          customerId: pick(customers).id,
          warehouseId: i % 2 === 0 ? centralWarehouse.id : westWarehouse.id,
          supplierId: supplier.id,
          status: 'fulfilled',
          totalAmount:
            (pick(products).unitPrice?.toNumber() ?? 20) *
            (1 + Math.floor(Math.random() * 3)),
          currency: 'USD',
          orderedAt,
          expectedDeliveryAt,
          deliveredAt,
        },
      });

      const delivery = await db.delivery.create({
        data: {
          organizationId: organization.id,
          orderId: order.id,
          warehouseId: order.warehouseId,
          supplierId: supplier.id,
          status: 'delivered',
          carrier: pick(['DHL', 'FedEx', 'Local Courier']),
          dispatchedAt: new Date(orderedAt.getTime() + DAY_MS),
          deliveredAt,
        },
      });

      if (delayed) {
        events.push({
          type: 'DELIVERY_DELAYED',
          entityType: 'Delivery',
          entityId: delivery.id,
          timestamp: deliveredAt,
          severity: 'High',
        });
      }

      const invoiceDueAt = new Date(orderedAt.getTime() + 14 * DAY_MS);
      const invoicePaid =
        invoiceDueAt < now ? Math.random() > 0.2 : Math.random() > 0.5;
      const invoiceAmount = Number(order.totalAmount);
      const invoice = await db.invoice.create({
        data: {
          organizationId: organization.id,
          customerId: order.customerId,
          amount: invoiceAmount,
          currency: 'USD',
          issuedAt: orderedAt,
          dueAt: invoiceDueAt,
          paidAt: invoicePaid
            ? new Date(invoiceDueAt.getTime() - Math.random() * 5 * DAY_MS)
            : null,
          status: invoicePaid
            ? 'paid'
            : invoiceDueAt < now
              ? 'overdue'
              : 'pending',
        },
      });

      if (!invoicePaid && invoiceDueAt < now) {
        overdueInvoiceTotal += invoiceAmount;
        events.push({
          type: 'INVOICE_OVERDUE',
          entityType: 'Invoice',
          entityId: invoice.id,
          timestamp: invoiceDueAt,
          severity: 'High',
          value: invoiceAmount,
        });
      }

      // Complaints track the delivery delays — a real downstream consequence,
      // not an independent random event, so the narrative stays coherent.
      if (delayed && Math.random() < 0.6) {
        complaintCount += 1;
        const complaint = await db.complaint.create({
          data: {
            organizationId: organization.id,
            customerId: order.customerId,
            orderId: order.id,
            category: 'Late delivery',
            severity: week === 3 ? 'High' : 'Medium',
            description: 'Order arrived later than the expected delivery date.',
            status: 'open',
          },
        });
        events.push({
          type: 'COMPLAINT_CREATED',
          entityType: 'Complaint',
          entityId: complaint.id,
          timestamp: complaint.createdAt,
          severity: complaint.severity ?? 'Medium',
        });
      }
    }

    // The upstream causal chain for Supplier A, made explicit as events —
    // not just inferred from downstream symptoms — see the product spec's
    // causal-chain example (Supplier delay -> Inventory shortage ->
    // Warehouse backlog -> ... -> Customer complaint).
    if (week === 2 && dayOffset === 14) {
      events.push({
        type: 'SUPPLIER_DELAY',
        entityType: 'Supplier',
        entityId: supplierA.id,
        timestamp: day,
        severity: 'Medium',
      });
    }
    if (week === 2 && dayOffset === 11) {
      const item = await db.inventoryItem.upsert({
        where: {
          productId_warehouseId: {
            productId: products[0].id,
            warehouseId: centralWarehouse.id,
          },
        },
        create: {
          organizationId: organization.id,
          productId: products[0].id,
          warehouseId: centralWarehouse.id,
          quantity: 8,
          reorderThreshold: 20,
        },
        update: { quantity: 8 },
      });
      events.push({
        type: 'INVENTORY_LOW',
        entityType: 'InventoryItem',
        entityId: item.id,
        timestamp: day,
        severity: 'Medium',
      });
    }
    if (week >= 2 && dayOffset === 9) {
      events.push({
        type: 'WAREHOUSE_BACKLOG',
        entityType: 'Warehouse',
        entityId: centralWarehouse.id,
        timestamp: day,
        severity: 'High',
      });
    }
  }

  console.log(`Writing ${events.length} operational events...`);
  await db.operationalEvent.createMany({
    data: events.map((e) => ({
      organizationId: organization.id,
      type: e.type,
      entityType: e.entityType,
      entityId: e.entityId,
      timestamp: e.timestamp,
      severity: e.severity,
      value: e.value,
      sourceId: 'seed-script',
    })),
  });

  const deliveryDelayCount = events.filter(
    (e) => e.type === 'DELIVERY_DELAYED',
  ).length;
  await db.metric.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Delivery delay count',
        key: 'delivery_delay_count',
        value: deliveryDelayCount,
        unit: 'count',
        periodStart: daysAgo(21),
        periodEnd: now,
        source: 'seed-script',
      },
      {
        organizationId: organization.id,
        name: 'Complaint count',
        key: 'complaint_count',
        value: complaintCount,
        unit: 'count',
        periodStart: daysAgo(21),
        periodEnd: now,
        source: 'seed-script',
      },
      {
        organizationId: organization.id,
        name: 'Invoice overdue amount',
        key: 'invoice_overdue_amount',
        value: overdueInvoiceTotal,
        unit: 'currency',
        periodStart: daysAgo(21),
        periodEnd: now,
        source: 'seed-script',
      },
    ],
  });

  // A representative "completed" DataImport so the Data page isn't empty on
  // first login — this one didn't come through the real upload flow, so it
  // carries no fileUrl the workflow would ever re-fetch.
  const dataSource = await db.dataSource.create({
    data: {
      organizationId: organization.id,
      name: 'CSV Uploads',
      type: 'CSV',
      status: 'active',
    },
  });
  await db.dataImport.create({
    data: {
      organizationId: organization.id,
      dataSourceId: dataSource.id,
      fileName: 'seed-demo-orders.csv',
      fileUrl: 'seed://demo',
      checksum: 'seed-demo-orders',
      status: 'Completed',
      recordsDetected: orderCounter,
      recordsImported: orderCounter,
      recordsRejected: 0,
      qualityScore: 1,
      startedAt: daysAgo(21),
      completedAt: daysAgo(21),
    },
  });

  // Completes the master spec's "Demo Scenario": OpsLens detects the
  // Supplier A pattern, creates an Issue, explains contributing factors,
  // and recommends reviewing Supplier A. Requires a real ANTHROPIC_API_KEY
  // — this makes real, billed Claude API calls, not simulated ones.
  console.log(
    'Running the intelligence pipeline against the seeded data (calls the real Claude API)...',
  );
  await analyzeOrganization(organization.id);

  // No-ops unless AI_MOCK_MODE is on — see its own doc comment for why a
  // freshly-detected Insight can't organically clear the Issue-creation
  // threshold, which is exactly what analyzeOrganization just demonstrated
  // above (its Insight logged "below_threshold" in mock-mode runs). This
  // gives Issue Detail / Recommendations / Notifications something real to
  // render while testing without a live ANTHROPIC_API_KEY.
  await createMockFixtureIssue(organization.id);

  console.log('Done.');
  console.log(`Demo login: ${user.email} / ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
