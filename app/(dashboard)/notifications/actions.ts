'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/authz';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, err, type ActionResult } from '@/lib/result';

// Read state is organization-wide, not per-user — see
// db-migration-runner/SKILL.md's Notification section for why. Any
// authenticated member of the org can mark the org's notifications read;
// no role check beyond organization membership, since this isn't a
// destructive or decision-recording action the way Issue/Recommendation
// changes are.
export async function markAllNotificationsRead(): Promise<ActionResult<null>> {
  const session = await requireSession();

  try {
    await db.notification.updateMany({
      where: {
        organizationId: session.user.organizationId,
        status: { not: 'Read' },
      },
      data: { status: 'Read' },
    });
  } catch (error) {
    logger.error('notifications.mark_read_failed', {
      organizationId: session.user.organizationId,
      error: String(error),
    });
    return err(
      'UPDATE_FAILED',
      "We couldn't mark your notifications as read. Please try again.",
    );
  }

  revalidatePath('/', 'layout');
  return ok(null);
}
