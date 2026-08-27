import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing, kept separate from the session module so that scripts (the
 * seed, any future CLI) can create users without pulling in Next.js request
 * APIs.
 */

/** scrypt hash stored as "<salt>:<derivedKey>". */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
