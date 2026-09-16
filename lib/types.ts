import { z } from 'zod';

// Re-exported from the Prisma-generated client (schema.prisma is the single
// source of truth for these enums) rather than redefined here, so the
// database, the API, and the UI can never drift apart — see code-style.md's
// TypeScript section and "Do not invent synonyms" rule.
export {
  ConfidenceLevel,
  IssueSeverity,
  NotificationSeverity,
  IssueStatus,
  RecommendationStatus,
  FeedbackType,
  NotificationChannel,
  RoleName,
  PlanTier,
  DataSourceType,
} from '@prisma/client';

// OperationalEvent.type is an open, extensible vocabulary, not a hard
// database enum — see db-migration-runner/SKILL.md's OperationalEvent model.
// Known examples today; the list is expected to grow as new detection logic
// ships, without a migration.
export const OPERATIONAL_EVENT_TYPES = [
  'DELIVERY_DELAYED',
  'INVENTORY_LOW',
  'INVOICE_OVERDUE',
  'COMPLAINT_CREATED',
  'PAYMENT_FAILED',
  'WAREHOUSE_BACKLOG',
  'SUPPLIER_DELAY',
  'ORDER_CANCELLED',
] as const;

export const operationalEventTypeSchema = z
  .string()
  .refine(
    (value) =>
      (OPERATIONAL_EVENT_TYPES as readonly string[]).includes(value) ||
      /^[A-Z][A-Z0-9_]*$/.test(value),
    'Event type must be SCREAMING_SNAKE_CASE',
  );

export type OperationalEventType =
  (typeof OPERATIONAL_EVENT_TYPES)[number] | (string & {});

// DataImport.status is a plain String column, not a Prisma enum — see
// db-migration-runner/SKILL.md's DataImport model note: this value set was
// originally a guess, implemented because Phase 2 needed a real value to
// write, still worth a developer sign-off.
export const DATA_IMPORT_STATUSES = [
  'Uploaded',
  'Validating',
  'MappingPending',
  'Processing',
  'Completed',
  'PartiallyCompleted',
  'Failed',
] as const;

export type DataImportStatus = (typeof DATA_IMPORT_STATUSES)[number];
