import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

// Node's built-in scrypt rather than an extra dependency (bcrypt/bcryptjs) —
// see code-style.md's "avoid unnecessary libraries" guidance. Never store or
// log the plaintext password — see security.md's Authentication section.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(':');
  if (!salt || !hashHex) return false;

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(hashHex, 'hex');
  if (derivedKey.length !== storedKey.length) return false;

  return timingSafeEqual(derivedKey, storedKey);
}
