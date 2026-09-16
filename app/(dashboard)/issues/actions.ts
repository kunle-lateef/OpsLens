'use server';

import { revalidatePath } from 'next/cache';
import { RoleName } from '@prisma/client';
import { requireSession, hasMinimumRole } from '@/lib/authz';
import { db } from '@/lib/db';
import {
  updateIssueStatusSchema,
  decideOnRecommendationSchema,
} from '@/lib/validators/issues';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { ok, err, type ActionResult } from '@/lib/result';

export async function updateIssueStatus(
  input: unknown,
): Promise<ActionResult<null>> {
  const session = await requireSession();

  if (!hasMinimumRole(session.user.roleName, RoleName.Analyst)) {
    return err('FORBIDDEN', 'Viewers cannot change issue status.');
  }

  const parsed = updateIssueStatusSchema.safeParse(input);
  if (!parsed.success) {
    return err('INVALID_INPUT', 'Please choose a valid status.');
  }
  const { issueId, status } = parsed.data;

  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.organizationId !== session.user.organizationId) {
    return err('NOT_FOUND', 'Issue not found.');
  }

  const previousValue = { status: issue.status };
  const timestampField =
    status === 'Acknowledged'
      ? { acknowledgedAt: new Date() }
      : status === 'Resolved'
        ? { resolvedAt: new Date() }
        : {};

  try {
    await db.$transaction([
      db.issue.update({
        where: { id: issueId },
        data: { status, ...timestampField },
      }),
      db.auditLog.create({
        data: {
          organizationId: session.user.organizationId,
          userId: session.user.id,
          action: 'issue.status_changed',
          entityType: 'Issue',
          entityId: issueId,
          previousValue,
          newValue: { status },
        },
      }),
    ]);
  } catch (error) {
    logger.error('issue.status_update_failed', {
      issueId,
      error: String(error),
    });
    return err(
      'UPDATE_FAILED',
      "We couldn't update this issue's status. Please try again.",
    );
  }

  if (status === 'Acknowledged') {
    track('issue_acknowledged', {
      organizationId: session.user.organizationId,
      issueId,
    });
  }

  revalidatePath(`/issues/${issueId}`);
  revalidatePath('/issues');
  revalidatePath('/overview');
  return ok(null);
}

export async function decideOnRecommendation(
  input: unknown,
): Promise<ActionResult<null>> {
  const session = await requireSession();

  if (!hasMinimumRole(session.user.roleName, RoleName.Analyst)) {
    return err('FORBIDDEN', 'Viewers cannot decide on recommendations.');
  }

  const parsed = decideOnRecommendationSchema.safeParse(input);
  if (!parsed.success) {
    return err('INVALID_INPUT', 'Please choose a valid decision.');
  }
  const { recommendationId, decision, note } = parsed.data;

  const recommendation = await db.recommendation.findUnique({
    where: { id: recommendationId },
  });
  if (
    !recommendation ||
    recommendation.organizationId !== session.user.organizationId
  ) {
    return err('NOT_FOUND', 'Recommendation not found.');
  }

  // A human decision is never silently overwritten — see AGENTS.md's
  // Non-Negotiable #3 and architecture.md's Data Flow section. This is the
  // enforcement point: once a Recommendation has left Pending, it stays as
  // immutable historical fact, full stop, regardless of what calls this
  // action next.
  if (recommendation.status !== 'Pending') {
    return err(
      'ALREADY_DECIDED',
      'A decision has already been recorded for this recommendation.',
    );
  }

  try {
    await db.$transaction([
      db.recommendation.update({
        where: { id: recommendationId },
        data: {
          status: decision,
          ...(note
            ? {
                rationale:
                  `${recommendation.rationale ?? ''}\n\nUser note: ${note}`.trim(),
              }
            : {}),
        },
      }),
      db.auditLog.create({
        data: {
          organizationId: session.user.organizationId,
          userId: session.user.id,
          action: 'recommendation.decided',
          entityType: 'Recommendation',
          entityId: recommendationId,
          previousValue: { status: 'Pending' },
          newValue: { status: decision, note },
        },
      }),
    ]);
  } catch (error) {
    logger.error('recommendation.decide_failed', {
      recommendationId,
      error: String(error),
    });
    return err(
      'UPDATE_FAILED',
      "We couldn't record your decision. Please try again.",
    );
  }

  logger.info('recommendation.decided', {
    recommendationId,
    decision,
    userId: session.user.id,
  });
  if (decision === 'Accepted') {
    track('recommendation_accepted', {
      organizationId: session.user.organizationId,
      recommendationId,
    });
  } else if (decision === 'Rejected') {
    track('recommendation_rejected', {
      organizationId: session.user.organizationId,
      recommendationId,
    });
  }

  revalidatePath(`/issues/${recommendation.issueId}`);
  return ok(null);
}
