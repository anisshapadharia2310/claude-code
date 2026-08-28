'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authenticate, createSession, destroySession } from '../auth/session';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export interface LoginState {
  error?: string;
  fieldErrors?: Partial<Record<'email' | 'password', string>>;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: LoginState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email' || key === 'password') fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok || !result.user) return { error: result.error ?? 'Sign-in failed.' };

  await createSession(result.user.id);
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}
