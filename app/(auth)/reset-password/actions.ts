'use server';

import { headers } from 'next/headers';
import { resetPasswordSchema } from '@/lib/validators/auth';
import { resetPasswordWithToken } from '@/lib/password-reset';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { ok, err, type ActionResult } from '@/lib/result';

export async function resetPassword(
  input: unknown,
): Promise<ActionResult<null>> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? 'unknown';

  // Rate-limited per security.md's Rate Limiting section ("Password reset
  // requests") — this is the token-guessing surface, not just the
  // request-a-link surface, so it needs the same protection.
  const limit = await rateLimit(`password-reset-confirm:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return err('RATE_LIMITED', 'Too many attempts. Try again in a minute.');
  }

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return err('INVALID_INPUT', 'Password must be at least 8 characters.');
  }

  try {
    const outcome = await resetPasswordWithToken(
      parsed.data.token,
      parsed.data.password,
    );
    if (outcome === 'invalid-or-expired') {
      return err(
        'INVALID_TOKEN',
        'This reset link is invalid or has expired. Request a new one.',
      );
    }
    return ok(null);
  } catch (error) {
    logger.error('password_reset.confirm_failed', { error: String(error) });
    return err(
      'RESET_FAILED',
      "We couldn't reset your password. Please try again.",
    );
  }
}
