'use client';
import { useActionState } from 'react';
import { loginAction, type AuthFormState } from '@/lib/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card>
      <CardContent className="p-5 pt-5">
        <form action={formAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required defaultValue="admin@signal.example" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required defaultValue="signal123" />
          </div>
          {state.error ? (
            <p role="alert" className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
