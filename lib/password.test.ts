import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(
      verifyPassword('correct-horse-battery-staple', hash),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const hashA = await hashPassword('same-password');
    const hashB = await hashPassword('same-password');
    expect(hashA).not.toBe(hashB);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    await expect(verifyPassword('anything', 'not-a-valid-hash')).resolves.toBe(
      false,
    );
  });
});
