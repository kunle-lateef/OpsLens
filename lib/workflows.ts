import { defineHook, FatalError } from 'workflow';
import { db } from '@/lib/db';
import { readBlobText } from '@/lib/storage';
import { parseCsvText, CsvParseError } from '@/lib/data-import/csv';
import { suggestMapping } from '@/lib/data-import/suggest-mapping';
import {
  collectLookupKeys,
  planNormalization,
  type ExistingLookups,
} from '@/lib/data-import/normalize';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { detectInsights } from '@/lib/intelligence/detect-insights';
import { explainRootCause } from '@/lib/intelligence/explain-root-cause';
import {
  createIssueFromInsight,
  type CreateIssueResult,
} from '@/lib/intelligence/create-issue-from-insight';
import { generateRecommendations } from '@/lib/intelligence/generate-recommendations';
import { recomputeHealthScore } from '@/lib/health-score';

// Vercel Workflow definitions and trigger functions for ingestion and
// intelligence — see architecture.md's Directory Layout and Tech Stack.
// The pipeline stages below follow architecture.md's AI Processing section
// exactly: Upload -> Validate -> Map -> Normalize -> Calculate Metrics ->
// Detect Insights -> Explain Root Cause -> Generate Recommendations.
//
// Each stage's actual logic lives in lib/intelligence/*.ts as a plain
// function with no Workflow SDK dependency (see that directory's
// analyze-organization.ts) — the step wrappers below exist so each AI call
// (and its DB writes) gets its own checkpoint and independent retry
// boundary, per architecture.md's "each is a distinct, independently
// retryable Claude API call within the same Vercel Workflow run." Any
// side-effecting call made directly inside a 'use workflow' function
// (rather than through a 'use step' wrapper) isn't checkpointed and could
// re-run on replay — every DB write below is wrapped for that reason, not
// just the ones that happen to call Claude.

/** Resumed by the mapping-confirmation server action — see app/(dashboard)/data/actions.ts. */
export const mappingConfirmedHook = defineHook<{ confirmed: true }>();

async function markFailed(dataImportId: string, message: string) {
  await db.dataImport.update({
    where: { id: dataImportId },
    data: { status: 'Failed', errorSummary: message, completedAt: new Date() },
  });
}

// --- Step: Validate + suggest mappings (Upload -> Validate -> the suggestion half of Map) ---
// Returns organizationId so the workflow body never needs its own direct
// Prisma call — Prisma depends on Node-native modules, which the Workflow
// SDK's compiler rejects anywhere in a 'use workflow' function's own scope
// (only step functions get full Node runtime access) — see
// https://useworkflow.dev/err/node-js-module-in-workflow.
async function validateAndSuggestMappings(
  dataImportId: string,
): Promise<{ organizationId: string }> {
  'use step';

  const dataImport = await db.dataImport.findUniqueOrThrow({
    where: { id: dataImportId },
  });
  await db.dataImport.update({
    where: { id: dataImportId },
    data: { status: 'Validating', startedAt: new Date() },
  });

  let parsed;
  try {
    const content = await readBlobText(dataImport.fileUrl);
    parsed = parseCsvText(content);
  } catch (error) {
    const message =
      error instanceof CsvParseError
        ? error.message
        : 'This file could not be read.';
    await markFailed(dataImportId, message);
    // Malformed content will never parse differently on retry — see the
    // Workflow SDK's FatalError docs: skip the automatic retry loop.
    throw new FatalError(message);
  }

  await db.dataImport.update({
    where: { id: dataImportId },
    data: { recordsDetected: parsed.rows.length },
  });

  // One DataMapping row per detected column, with a deterministic suggested
  // target — see lib/data-import/suggest-mapping.ts. The user reviews and
  // confirms these before import; AI-suggested (here, rule-suggested)
  // mappings never silently overwrite a user-confirmed one — see
  // architecture.md's Data Flow section.
  await db.$transaction(
    parsed.headers.map((header) => {
      const suggestion = suggestMapping(header);
      return db.dataMapping.create({
        data: {
          dataImportId,
          sourceField: header,
          targetEntity: suggestion?.entity ?? null,
          targetField: suggestion?.field ?? null,
          confidence: suggestion?.confidence ?? null,
          confirmedByUser: false,
        },
      });
    }),
  );

  await db.dataImport.update({
    where: { id: dataImportId },
    data: { status: 'MappingPending' },
  });

  return { organizationId: dataImport.organizationId };
}

// --- Step: Normalize (Normalize) ---
// Bulk-reads what already exists, hands it to the pure planner in
// lib/data-import/normalize.ts, then bulk-writes the result — see that
// file's header comment for why this replaced a one-row-at-a-time loop of
// findFirst/create calls (a real performance bug on a large CSV, found and
// flagged during the Phase 7 pass, fixed here).
async function normalizeImportedData(dataImportId: string) {
  'use step';

  const dataImport = await db.dataImport.findUniqueOrThrow({
    where: { id: dataImportId },
  });
  await db.dataImport.update({
    where: { id: dataImportId },
    data: { status: 'Processing' },
  });

  const confirmedMappings = await db.dataMapping.findMany({
    where: {
      dataImportId,
      confirmedByUser: true,
      targetEntity: { not: null },
      targetField: { not: null },
    },
  });
  const mappings = confirmedMappings.map((m) => ({
    entity: m.targetEntity as string,
    field: m.targetField as string,
    sourceField: m.sourceField,
  }));

  const content = await readBlobText(dataImport.fileUrl);
  const { rows } = parseCsvText(content);

  const organizationId = dataImport.organizationId;
  const keys = collectLookupKeys(rows, mappings);

  const [
    existingCustomers,
    existingWarehouses,
    existingSuppliers,
    existingOrders,
  ] = await Promise.all([
    keys.customerExternalIds.length > 0 || keys.customerEmails.length > 0
      ? db.customer.findMany({
          where: {
            organizationId,
            OR: [
              keys.customerExternalIds.length > 0
                ? { externalId: { in: keys.customerExternalIds } }
                : undefined,
              keys.customerEmails.length > 0
                ? { email: { in: keys.customerEmails } }
                : undefined,
            ].filter((clause): clause is NonNullable<typeof clause> =>
              Boolean(clause),
            ),
          },
          select: { id: true, externalId: true, email: true },
        })
      : Promise.resolve([]),
    keys.warehouseNames.length > 0
      ? db.warehouse.findMany({
          where: { organizationId, name: { in: keys.warehouseNames } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    keys.supplierNames.length > 0
      ? db.supplier.findMany({
          where: { organizationId, name: { in: keys.supplierNames } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    keys.orderExternalIds.length > 0
      ? db.order.findMany({
          where: {
            organizationId,
            externalId: { in: keys.orderExternalIds },
          },
          select: { id: true, externalId: true },
        })
      : Promise.resolve([]),
  ]);

  const existing: ExistingLookups = {
    customerIdByExternalId: new Map(
      existingCustomers
        .filter((c) => c.externalId)
        .map((c) => [c.externalId as string, c.id]),
    ),
    customerIdByEmail: new Map(
      existingCustomers
        .filter((c) => c.email)
        .map((c) => [c.email as string, c.id]),
    ),
    warehouseIdByName: new Map(existingWarehouses.map((w) => [w.name, w.id])),
    supplierIdByName: new Map(existingSuppliers.map((s) => [s.name, s.id])),
    orderIdByExternalId: new Map(
      existingOrders
        .filter((o) => o.externalId)
        .map((o) => [o.externalId as string, o.id]),
    ),
  };

  const plan = planNormalization(
    rows,
    mappings,
    organizationId,
    dataImportId,
    existing,
    new Date(),
    () => crypto.randomUUID(),
  );

  // Every id below was generated by planNormalization itself, so these
  // writes need no RETURNING/re-fetch — and the order matters: orders must
  // exist before deliveries/complaints that reference orderId, and
  // deliveries/invoices/complaints must exist before the events that
  // reference their entityId.
  if (plan.customersToCreate.length > 0) {
    await db.customer.createMany({ data: plan.customersToCreate });
  }
  if (plan.warehousesToCreate.length > 0) {
    await db.warehouse.createMany({ data: plan.warehousesToCreate });
  }
  if (plan.suppliersToCreate.length > 0) {
    await db.supplier.createMany({ data: plan.suppliersToCreate });
  }
  if (plan.ordersToCreate.length > 0) {
    await db.order.createMany({ data: plan.ordersToCreate });
  }
  // Orders that already existed before this import need a per-row update —
  // each one's new values differ, so this can't be a single batched
  // statement without raw SQL (see security.md's SQL Injection section on
  // why that's off the table). This is the one part of the pipeline that
  // still scales with row count, but only for rows that re-touch a
  // previously-imported order, not for a fresh import's full row count.
  for (const { id, data } of plan.ordersToUpdate) {
    await db.order.update({ where: { id }, data });
  }
  if (plan.deliveriesToCreate.length > 0) {
    await db.delivery.createMany({ data: plan.deliveriesToCreate });
  }
  if (plan.invoicesToCreate.length > 0) {
    await db.invoice.createMany({ data: plan.invoicesToCreate });
  }
  if (plan.complaintsToCreate.length > 0) {
    await db.complaint.createMany({ data: plan.complaintsToCreate });
  }
  if (plan.eventsToCreate.length > 0) {
    await db.operationalEvent.createMany({ data: plan.eventsToCreate });
  }

  const { imported, rejected, errors } = plan;
  const qualityScore = rows.length > 0 ? imported / rows.length : 0;
  const status =
    imported === 0
      ? 'Failed'
      : rejected > 0
        ? 'PartiallyCompleted'
        : 'Completed';

  await db.dataImport.update({
    where: { id: dataImportId },
    data: {
      status,
      recordsImported: imported,
      recordsRejected: rejected,
      qualityScore,
      errorSummary: errors.length > 0 ? errors.join('\n') : null,
      completedAt: new Date(),
    },
  });

  logger.info('data_import.normalized', { dataImportId, imported, rejected });
}

// --- Step: Calculate Metrics ---
async function calculateMetrics(dataImportId: string) {
  'use step';

  const dataImport = await db.dataImport.findUniqueOrThrow({
    where: { id: dataImportId },
  });
  const events = await db.operationalEvent.findMany({
    where: {
      organizationId: dataImport.organizationId,
      sourceId: dataImportId,
    },
  });

  if (events.length === 0) return;

  const periodStart = new Date(
    Math.min(...events.map((e) => e.timestamp.getTime())),
  );
  const periodEnd = new Date(
    Math.max(...events.map((e) => e.timestamp.getTime())),
  );

  const deliveryDelays = events.filter((e) => e.type === 'DELIVERY_DELAYED');
  const overdueInvoices = events.filter((e) => e.type === 'INVOICE_OVERDUE');
  const complaints = events.filter((e) => e.type === 'COMPLAINT_CREATED');

  const metrics = [
    {
      name: 'Delivery delay count',
      key: 'delivery_delay_count',
      value: deliveryDelays.length,
      unit: 'count',
    },
    {
      name: 'Invoice overdue amount',
      key: 'invoice_overdue_amount',
      value: overdueInvoices.reduce((sum, e) => sum + (e.value ?? 0), 0),
      unit: 'currency',
    },
    {
      name: 'Complaint count',
      key: 'complaint_count',
      value: complaints.length,
      unit: 'count',
    },
  ].filter((m) => m.value > 0);

  if (metrics.length === 0) return;

  await db.$transaction(
    metrics.map((metric) =>
      db.metric.create({
        data: {
          organizationId: dataImport.organizationId,
          name: metric.name,
          key: metric.key,
          value: metric.value,
          unit: metric.unit,
          periodStart,
          periodEnd,
          source: `DataImport:${dataImportId}`,
        },
      }),
    ),
  );
}

// --- Step: Detect Insights (AI stage 1) ---
async function detectInsightsStep(organizationId: string): Promise<string[]> {
  'use step';
  return detectInsights(organizationId);
}

// --- Step: Explain Root Cause (AI stage 2) + deterministic Issue creation ---
// Combined into one step: Issue creation is a quick deterministic operation
// sandwiched between two AI calls, not expensive or fallible enough on its
// own to need a separate retry boundary from the root-cause call it
// depends on. createIssueFromInsight is idempotent, so a retried step
// doesn't create a duplicate Issue.
async function explainAndPrioritizeStep(
  insightId: string,
): Promise<CreateIssueResult> {
  'use step';
  await explainRootCause(insightId);
  return createIssueFromInsight(insightId);
}

// --- Step: Generate Recommendations (AI stage 3) ---
async function generateRecommendationsStep(issueId: string): Promise<void> {
  'use step';
  await generateRecommendations(issueId);
}

// --- Step: recompute + cache the Health Score ---
async function recomputeHealthScoreStep(organizationId: string): Promise<void> {
  'use step';
  await recomputeHealthScore(organizationId);
}

// --- Workflow: orchestrates the pipeline stages above ---
export async function ingestDataImportWorkflow(dataImportId: string) {
  'use workflow';

  let organizationId: string;
  try {
    ({ organizationId } = await validateAndSuggestMappings(dataImportId));
  } catch {
    // Already marked Failed with a user-facing errorSummary inside the step
    // — nothing more to do. A single stage's failure produces a
    // partially-completed run rather than crashing the whole pipeline, per
    // architecture.md's AI Processing section.
    return;
  }

  const hook = mappingConfirmedHook.create({ token: dataImportId });
  await hook;

  await normalizeImportedData(dataImportId);
  await calculateMetrics(dataImportId);

  track('dataset_imported', { dataImportId });

  // Detect Insights -> Explain Root Cause -> Generate Recommendations —
  // stage 1 runs first and blocks stages 2 and 3, since both reference an
  // Insight/Issue foreign key that doesn't exist until stage 1 persists it.
  // A schema-validation failure or AI-call failure on one insight doesn't
  // block the others — each lib/intelligence/*.ts function already handles
  // its own failure by logging and returning early, never throwing past
  // its step boundary.
  const insightIds = await detectInsightsStep(organizationId);
  for (const insightId of insightIds) {
    const result = await explainAndPrioritizeStep(insightId);
    // Only generate Recommendations for a newly-created Issue — see
    // create-issue-from-insight.ts's CreateIssueResult doc comment.
    if (result?.isNew) {
      await generateRecommendationsStep(result.issueId);
    }
  }

  await recomputeHealthScoreStep(organizationId);
}
