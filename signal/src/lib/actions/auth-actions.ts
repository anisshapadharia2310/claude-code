'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { destroySession, signIn } from '@/lib/auth';

const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export interface AuthFormState {
  error?: string;
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await signIn(parsed.data.email, parsed.data.password);
  if (!user) return { error: 'Those credentials were not recognised.' };
  redirect('/dashboard');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
