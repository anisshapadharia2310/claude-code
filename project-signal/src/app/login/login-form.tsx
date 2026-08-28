'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Alert } from '@/components/ui/misc';
import { loginAction, type LoginState } from '@/server/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block size="lg" loading={pending} trailingIcon={pending ? undefined : 'chevronRight'}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="mt-7 space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Email address" htmlFor="email" required error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue="manager@signal.agency"
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          required
        />
      </Field>

      <Field label="Password" htmlFor="password" required error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="signal123"
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
