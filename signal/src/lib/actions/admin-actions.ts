'use server';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import type { ActionState } from './campaign-actions';

const userSchema = z.object({
  name: z.string().trim().min(2, 'Enter the person’s name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireApiCapability('user:manage');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = userSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: 'A user with that email already exists.' };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      passwordHash: hashPassword(parsed.data.password),
    },
  });

  revalidatePath('/admin/users');
  return { ok: true, message: `${parsed.data.name} added as ${parsed.data.role.toLowerCase()}.` };
}

export async function toggleUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let actor;
  try {
    actor = await requireApiCapability('user:manage');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const id = String(formData.get('userId'));
  if (id === actor.id) return { error: 'You cannot deactivate your own account.' };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: 'That user no longer exists.' };

  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  revalidatePath('/admin/users');
  return { ok: true, message: `${user.name} ${user.isActive ? 'deactivated' : 'reactivated'}.` };
}
