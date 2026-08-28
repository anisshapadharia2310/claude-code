'use client';

import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field, Input, Select } from '@/components/ui/form';
import { createUserAction } from '@/server/actions/admin';

export function CreateUserForm({ roles }: { roles: Array<{ value: string; label: string }> }) {
  return (
    <ActionForm action={createUserAction} className="space-y-4">
      {(state) => (
        <>
          <Field label="Name" htmlFor="name" required error={state.fieldErrors?.name}>
            <Input id="name" name="name" required autoComplete="name"
              aria-invalid={state.fieldErrors?.name ? true : undefined} />
          </Field>

          <Field label="Email" htmlFor="email" required error={state.fieldErrors?.email}>
            <Input id="email" name="email" type="email" required autoComplete="email"
              aria-invalid={state.fieldErrors?.email ? true : undefined} />
          </Field>

          <Field label="Role" htmlFor="role" hint="Decides which screens and actions this person can reach.">
            <Select id="role" name="role" defaultValue="RESEARCHER">
              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </Select>
          </Field>

          <Field
            label="Temporary password" htmlFor="password" required
            error={state.fieldErrors?.password} hint="At least 8 characters."
          >
            <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password"
              aria-invalid={state.fieldErrors?.password ? true : undefined} />
          </Field>

          <SubmitButton icon="plus" block pendingLabel="Creating…">Create user</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
