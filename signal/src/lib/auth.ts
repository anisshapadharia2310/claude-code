import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { prisma } from './db';
import { verifyPassword } from './password';

const COOKIE_NAME = 'signal_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET is not set. Copy .env.example to .env.');
  return value;
}

// --------------------------------------------------------------- passwords

export { hashPassword, verifyPassword } from './password';

// ---------------------------------------------------------------- sessions

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface SessionPayload {
  userId: string;
  expiresAt: number;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const token = encodeSession({ userId, expiresAt: Date.now() + SESSION_TTL_MS });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Current user, or null when signed out. Safe to call from any server code. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = decodeSession(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function signIn(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) return null;
  await createSession(user.id);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// ------------------------------------------------------- role-based access

/**
 * Capability map. Pages and API routes ask for a capability rather than testing
 * roles inline, so permissions stay in one auditable place.
 */
export const PERMISSIONS = {
  ADMIN: [
    'campaign:manage',
    'campaign:view',
    'scoring:configure',
    'user:manage',
    'compliance:manage',
    'contact:import',
    'contact:edit',
    'contact:view',
    'review:perform',
    'outreach:perform',
    'dashboard:view',
    'export:perform',
    'p1:approve',
  ],
  MANAGER: [
    'campaign:manage',
    'campaign:view',
    'contact:view',
    'contact:edit',
    'review:perform',
    'dashboard:view',
    'export:perform',
    'p1:approve',
    'outreach:perform',
  ],
  RESEARCHER: [
    'campaign:view',
    'contact:import',
    'contact:edit',
    'contact:view',
    'review:perform',
    'dashboard:view',
    'export:perform',
  ],
  CALLER: ['campaign:view', 'contact:view', 'outreach:perform', 'dashboard:view'],
} as const satisfies Record<UserRole, readonly string[]>;

export type Capability = (typeof PERMISSIONS)[UserRole][number];

export function can(role: UserRole, capability: string): boolean {
  return (PERMISSIONS[role] as readonly string[]).includes(capability);
}

/** Redirects to the sign-in page when there is no session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Redirects signed-in users who lack the capability to the dashboard. */
export async function requireCapability(capability: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, capability)) redirect('/dashboard?denied=' + encodeURIComponent(capability));
  return user;
}

export class ApiAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** API-route equivalent of requireCapability; throws instead of redirecting. */
export async function requireApiCapability(capability: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiAuthError('Authentication required.', 401);
  if (!can(user.role, capability)) {
    throw new ApiAuthError(`Your role (${user.role}) cannot perform "${capability}".`, 403);
  }
  return user;
}
