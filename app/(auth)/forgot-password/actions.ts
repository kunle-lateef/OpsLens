'use server';

import { headers } from 'next/headers';
import { requestPasswordResetSchema } from '@/lib/validators/auth';
import { issuePasswordResetToken } from '@/lib/password-reset';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { ok, err, type ActionResult } from '@/lib/result';

// Always returns the same generic success message regardless of whether the
// email matches an account — see lib/password-reset.ts's
// issuePasswordResetToken doc comment. Confirming/denying an email's
// existence in the response is itself a user-enumeration leak.
export async function requestPasswordReset(
  input: unknown,
): Promise<ActionResult<null>> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? 'unknown';

  // Rate-limited per security.md's Rate Limiting section ("Password reset
  // requests"). Limited by IP, not by the submitted email — the email isn't
  // validated yet at this point, and limiting by attacker-controlled input
  // alone would let someone bypass the limit by varying the email per
  // request while still hammering the same account.
  const limit = await rateLimit(`password-reset:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return err('RATE_LIMITED', 'Too many requests. Try again in a minute.');
  }

  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return err('INVALID_INPUT', 'Please enter a valid email address.');
  }

  try {
    await issuePasswordResetToken(parsed.data.email);
  } catch (error) {
    // Still return the generic success message to the caller — see the
    // function doc comment above — but log the real failure.
    logger.error('password_reset.request_failed', { error: String(error) });
  }

  return ok(null);
}
