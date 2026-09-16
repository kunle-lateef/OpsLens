'use server';

import { headers } from 'next/headers';
import { Prisma } from '@prisma/client';
import { signUpSchema } from '@/lib/validators/auth';
import { createOrganizationWithOwner } from '@/lib/organizations';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { track } from '@/lib/analytics';
import { ok, err, type ActionResult } from '@/lib/result';

type SignUpData = { organizationId: string };

export async function signUp(
  input: unknown,
): Promise<ActionResult<SignUpData>> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? 'unknown';

  // Rate-limited unconditionally per security.md's Rate Limiting section.
  const limit = await rateLimit(`signup:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return err(
      'RATE_LIMITED',
      'Too many sign-up attempts. Try again in a minute.',
    );
  }

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return err('INVALID_INPUT', 'Please check the form and try again.');
  }

  try {
    const { organization, user } = await createOrganizationWithOwner(
      parsed.data,
    );
    logger.info('workspace.created', { organizationId: organization.id });
    track('workspace_created', { organizationId: organization.id });
    track('user_signed_up', {
      organizationId: organization.id,
      userId: user.id,
    });
    return ok({ organizationId: organization.id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return err('EMAIL_TAKEN', 'An account with that email already exists.');
    }
    logger.error('signup.failed', { error: String(error) });
    return err(
      'SIGNUP_FAILED',
      "We couldn't create your workspace. Please try again.",
    );
  }
}
