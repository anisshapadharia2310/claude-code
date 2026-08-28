import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { User, UserRole } from '@prisma/client';
import { getRepository } from '../repo';

const COOKIE_NAME = 'signal_session';

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    // Fail loudly rather than silently signing sessions with a weak key.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set to at least 16 characters in production.');
    }
    return 'development-only-insecure-session-secret';
  }
  return value;
}

function ttlSeconds(): number {
  const value = Number.parseInt(process.env.SESSION_TTL_SECONDS ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : 28_800;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** token = base64url(userId.expiresAt).signature */
function createToken(userId: string): string {
  const payload = `${userId}.${Date.now() + ttlSeconds() * 1000}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const payload = Buffer.from(encoded, 'base64url').toString('utf8');
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const separator = payload.lastIndexOf('.');
  const userId = payload.slice(0, separator);
  const expiresAt = Number.parseInt(payload.slice(separator + 1), 10);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return userId;
}

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ttlSeconds(),
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** The signed-in user, or null. Never throws. */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = readToken(token);
  if (!userId) return null;
  const repo = await getRepository();
  const user = await repo.getUserById(userId);
  return user?.isActive ? user : null;
}

export interface AuthenticateResult {
  ok: boolean;
  user?: User;
  error?: string;
}

export async function authenticate(email: string, password: string): Promise<AuthenticateResult> {
  const { verifyPassword } = await import('./password');
  const repo = await getRepository();
  const user = await repo.getUserByEmail(email.trim().toLowerCase());
  // Same message either way: do not reveal which addresses exist.
  if (!user || !user.isActive) return { ok: false, error: 'Email or password is incorrect.' };
  if (!verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: 'Email or password is incorrect.' };
  }
  return { ok: true, user };
}

export type { User, UserRole };
