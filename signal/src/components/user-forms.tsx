'use client';
import { useActionState } from 'react';
import { UserRole } from '@prisma/client';
import { createUserAction, toggleUserAction } from '@/lib/actions/admin-actions';
import type { ActionState } from '@/lib/actions/campaign-actions';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { FormMessage } from '@/components/form-message';
import { humanize } from '@/lib/utils';

const initialState: ActionState = {};

const ROLE_HELP: Record<UserRole, string> = {
  ADMIN: 'Manages campaigns, scoring rules, users and compliance settings.',
  MANAGER: 'Views dashboards, approves P1 contacts and exports reports.',
  RESEARCHER: 'Imports and enriches contact data, works the review queue.',
  CALLER: 'Works an assigned list, sees scripts, records call outcomes.',
};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue={UserRole.RESEARCHER}>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {humanize(role)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Temporary password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
      </div>
      <ul className="space-y-0.5 text-[11px] text-muted-foreground">
        {Object.entries(ROLE_HELP).map(([role, help]) => (
          <li key={role}>
            <span className="font-medium text-navy-800">{humanize(role)}:</span> {help}
          </li>
        ))}
      </ul>
      <FormMessage state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Creating...' : 'Add user'}
      </Button>
    </form>
  );
}

export function ToggleUserButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [state, formAction, pending] = useActionState(toggleUserAction, initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" size="sm" variant={isActive ? 'outline' : 'success'} disabled={pending}>
        {isActive ? 'Deactivate' : 'Reactivate'}
      </Button>
      {state.error ? <span className="text-xs text-red-700">{state.error}</span> : null}
    </form>
  );
}
