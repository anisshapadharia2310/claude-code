import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@prisma/client';
import { can, type Permission } from './rbac';
import { getSessionUser } from './session';

/** Redirects to the sign-in page when nobody is signed in. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Requires a capability. Sends the user to the forbidden page rather than the
 * sign-in page, so a signed-in user is not asked to sign in again.
 */
export async function requirePermission(permission: Permission): Promise<User> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect(`/forbidden?need=${permission}`);
  return user;
}

/** For server actions: throws instead of redirecting, so the caller can report. */
export async function assertPermission(permission: Permission): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error('You are not signed in.');
  if (!can(user.role, permission)) {
    throw new Error(`Your role (${user.role}) is not allowed to perform this action.`);
  }
  return user;
}
