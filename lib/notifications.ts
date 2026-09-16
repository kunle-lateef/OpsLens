import {
  NotificationChannel,
  type IssueSeverity,
  type NotificationSeverity,
} from '@prisma/client';
import { db } from '@/lib/db';

// In-app notifications — see db-migration-runner/SKILL.md's Notification
// section for the schema shape and the org-wide-read scoping decision.
// Only the InApp channel is written today; Email/SMS/Push are modeled in
// the schema but not implemented (see NotificationChannel's own comment in
// prisma/schema.prisma).

// IssueSeverity and NotificationSeverity are deliberately distinct enums
// (see code-style.md) — this is a genuine type conversion at the one place
// an Issue's severity needs to be stored as a Notification's, not a
// shortcut to reuse a rendering code path. Only 'Low' has no matching
// NotificationSeverity member, so it maps to 'Informational'; every other
// value is a direct pass-through since the enums share those spellings.
export function issueSeverityToNotificationSeverity(
  severity: IssueSeverity,
): NotificationSeverity {
  return severity === 'Low' ? 'Informational' : severity;
}

export async function createNotification(input: {
  organizationId: string;
  severity: NotificationSeverity;
  message: string;
  linkUrl?: string;
  eventId?: string;
}) {
  return db.notification.create({
    data: {
      organizationId: input.organizationId,
      severity: input.severity,
      message: input.message,
      linkUrl: input.linkUrl,
      eventId: input.eventId,
      channel: NotificationChannel.InApp,
      status: 'Sent',
    },
  });
}

const RECENT_LIMIT = 20;

export async function listRecentNotifications(organizationId: string) {
  return db.notification.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: RECENT_LIMIT,
  });
}

export async function countUnreadNotifications(organizationId: string) {
  return db.notification.count({
    where: { organizationId, status: { not: 'Read' } },
  });
}
