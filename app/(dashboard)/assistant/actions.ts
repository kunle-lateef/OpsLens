'use server';

import { requireSession } from '@/lib/authz';
import { db } from '@/lib/db';
import { submitFeedbackSchema } from '@/lib/validators/feedback';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { ok, err, type ActionResult } from '@/lib/result';

// Users should be able to report incorrect AI conclusions — see the
// product spec's Responsible AI section. Scoped to AIInteraction only for
// now (the Assistant is the one surface with a feedback control today);
// Feedback.targetType is designed to extend to Insight/Issue/Recommendation
// later without a schema change.
export async function submitFeedback(
  input: unknown,
): Promise<ActionResult<null>> {
  const session = await requireSession();

  const parsed = submitFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return err('INVALID_INPUT', 'Please try again.');
  }
  const { targetType, targetId, type, comment } = parsed.data;

  const interaction = await db.aIInteraction.findUnique({
    where: { id: targetId },
  });
  if (
    !interaction ||
    interaction.organizationId !== session.user.organizationId
  ) {
    return err('NOT_FOUND', 'This answer could not be found.');
  }

  try {
    await db.feedback.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        targetType,
        targetId,
        type,
        comment,
      },
    });
  } catch (error) {
    logger.error('feedback.submit_failed', {
      targetId,
      error: String(error),
    });
    return err(
      'SUBMIT_FAILED',
      "We couldn't submit your feedback. Please try again.",
    );
  }

  track('ai_feedback_submitted', {
    organizationId: session.user.organizationId,
    targetId,
    type,
  });
  return ok(null);
}
