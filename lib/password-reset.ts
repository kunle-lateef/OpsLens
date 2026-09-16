import { randomBytes, createHash } from 'crypto';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { sendEmail } from '@/lib/email';
import { env } from '@/lib/env';

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// sha256, not lib/password.ts's scrypt — see db-migration-runner/SKILL.md's
// PasswordResetToken section for why: this hashes a 256-bit random value we
// generated, not a low-entropy user-chosen secret, and needs a deterministic
// lookup by tokenHash rather than scrypt's per-call salt.
function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Issues a password reset link for the given email and sends it, if — and
 * only observably if to anything watching the response — an account with
 * that email exists. Callers must always return the same generic message
 * regardless of the boolean this resolves, per the requestPasswordReset
 * server action: confirming or denying an email's existence here is itself
 * a user-enumeration leak.
 */
export async function issuePasswordResetToken(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;

  const rawToken = randomBytes(TOKEN_BYTES).toString('hex');
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const resetUrl = new URL('/reset-password', env.NEXT_PUBLIC_APP_URL);
  resetUrl.searchParams.set('token', rawToken);

  await sendEmail({
    to: user.email,
    subject: 'Reset your OpsLens password',
    body: `Someone requested a password reset for this account. This link expires in 1 hour and can only be used once:\n\n${resetUrl.toString()}\n\nIf you didn't request this, you can ignore this email.`,
  });
}

export type ResetPasswordOutcome = 'success' | 'invalid-or-expired';

/**
 * Validates a raw reset token and, if valid and unexpired, sets the new
 * password and invalidates every other outstanding token for that user —
 * see db-migration-runner/SKILL.md's Special Rules for why.
 */
export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string,
): Promise<ResetPasswordOutcome> {
  const tokenHash = hashToken(rawToken);
  const tokenRow = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt < new Date()) {
    return 'invalid-or-expired';
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  await db.$transaction([
    db.user.update({
      where: { id: tokenRow.userId },
      data: { passwordHash },
    }),
    db.passwordResetToken.updateMany({
      where: { userId: tokenRow.userId, usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  return 'success';
}
