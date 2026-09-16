import { createHash } from 'crypto';
import { describe, expect, it, vi } from 'vitest';

const mockDb = {
  user: { findUnique: vi.fn(), update: vi.fn() },
  passwordResetToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((operations: unknown[]) => Promise.all(operations)),
};
vi.mock('@/lib/db', () => ({ db: mockDb }));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_APP_URL: 'https://opslens.example.com' },
}));

const { issuePasswordResetToken, resetPasswordWithToken } =
  await import('./password-reset');

function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex');
}

describe('issuePasswordResetToken', () => {
  it('does nothing when no user matches the email — never reveals whether the account exists', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(null);

    await issuePasswordResetToken('nobody@example.com');

    expect(mockDb.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('creates a token and emails a reset link when the user exists', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'owner@example.com',
    });

    await issuePasswordResetToken('owner@example.com');

    expect(mockDb.passwordResetToken.create).toHaveBeenCalledOnce();
    const createArgs = mockDb.passwordResetToken.create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe('user-1');
    expect(createArgs.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const emailArgs = mockSendEmail.mock.calls[0][0];
    expect(emailArgs.to).toBe('owner@example.com');
    expect(emailArgs.body).toContain(
      'https://opslens.example.com/reset-password?token=',
    );
  });
});

describe('resetPasswordWithToken', () => {
  it('returns invalid-or-expired when the token does not exist', async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValueOnce(null);

    const outcome = await resetPasswordWithToken(
      'bogus-token',
      'new-password-123',
    );

    expect(outcome).toBe('invalid-or-expired');
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('returns invalid-or-expired when the token was already used', async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const outcome = await resetPasswordWithToken(
      'used-token',
      'new-password-123',
    );

    expect(outcome).toBe('invalid-or-expired');
  });

  it('returns invalid-or-expired when the token has expired', async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const outcome = await resetPasswordWithToken(
      'expired-token',
      'new-password-123',
    );

    expect(outcome).toBe('invalid-or-expired');
  });

  it('updates the password and invalidates outstanding tokens for a valid token', async () => {
    const rawToken = 'a-valid-raw-token';
    mockDb.passwordResetToken.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const outcome = await resetPasswordWithToken(rawToken, 'new-password-123');

    expect(outcome).toBe('success');
    expect(mockDb.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(rawToken) },
    });
    expect(mockDb.$transaction).toHaveBeenCalledOnce();
    expect(mockDb.user.update).toHaveBeenCalledOnce();
    expect(mockDb.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });
});
