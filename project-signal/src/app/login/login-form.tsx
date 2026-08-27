'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/form';
import { Alert } from '@/components/ui/misc';
import { loginAction, type LoginState } from '@/server/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue="manager@signal.agency"
          required
        />
        <FieldError>{state.fieldErrors?.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="signal123"
          required
        />
        <FieldError>{state.fieldErrors?.password}</FieldError>
      </div>

      <SubmitButton />
    </form>
  );
}
