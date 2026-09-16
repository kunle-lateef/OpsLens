'use server';

import { revalidatePath } from 'next/cache';
import { RoleName } from '@prisma/client';
import { requireSession, hasMinimumRole } from '@/lib/authz';
import { rateLimit } from '@/lib/rate-limit';
import { generateWeeklyReport } from '@/lib/intelligence/generate-weekly-report';
import { track } from '@/lib/analytics';
import { ok, err, type ActionResult } from '@/lib/result';

export async function generateReport(): Promise<
  ActionResult<{ reportId: string }>
> {
  const session = await requireSession();
  const organizationId = session.user.organizationId;

  if (!hasMinimumRole(session.user.roleName, RoleName.Analyst)) {
    return err('FORBIDDEN', 'Viewers cannot generate reports.');
  }

  // Rate-limited like any other action that triggers a new AI generation
  // run — see security.md's Rate Limiting section.
  const limit = await rateLimit(`report:${organizationId}`, 5, 60_000);
  if (!limit.allowed) {
    return err(
      'RATE_LIMITED',
      'Please wait a moment before generating another report.',
    );
  }

  try {
    const reportId = await generateWeeklyReport(
      organizationId,
      session.user.id,
    );
    track('report_generated', { organizationId, reportId });
    revalidatePath('/reports');
    return ok({ reportId });
  } catch {
    return err(
      'GENERATION_FAILED',
      "We couldn't generate a report from the available data. Try again once more data has come in.",
    );
  }
}
