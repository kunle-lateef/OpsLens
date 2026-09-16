import type { AuditLog } from '@prisma/client';

/**
 * Turns a raw AuditLog row into a human sentence for Activity History —
 * previously rendered as the literal action string (e.g. "issue.status_
 * changed"). Only two actions exist today (see app/(dashboard)/issues/
 * actions.ts); the fallback reformats anything added later rather than
 * requiring this file to be updated in lockstep, though it should be.
 */
export function humanizeAuditLogEntry(
  entry: Pick<AuditLog, 'action' | 'newValue'>,
): string {
  const newValue = entry.newValue as Record<string, unknown> | null;
  const newStatus =
    typeof newValue?.status === 'string' ? newValue.status : null;

  switch (entry.action) {
    case 'issue.status_changed':
      return newStatus
        ? `Status changed to ${humanizeCamelCase(newStatus)}`
        : 'Status changed';
    case 'recommendation.decided':
      switch (newStatus) {
        case 'Accepted':
          return 'Recommendation accepted';
        case 'Rejected':
          return 'Recommendation rejected';
        case 'Modified':
          return 'Recommendation marked as modified';
        case 'Dismissed':
          return 'Recommendation dismissed';
        default:
          return 'Recommendation decided';
      }
    default:
      return entry.action.replace(/[._]/g, ' ');
  }
}

function humanizeCamelCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}
