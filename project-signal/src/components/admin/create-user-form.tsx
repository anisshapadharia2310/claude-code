'use client';

import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { FieldError, Input, Label, Select } from '@/components/ui/form';
import { createUserAction } from '@/server/actions/admin';

export function CreateUserForm({ roles }: { roles: Array<{ value: string; label: string }> }) {
  return (
    <ActionForm action={createUserAction} className="space-y-3">
      {(state) => (
        <>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
            <FieldError>{state.fieldErrors?.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            <FieldError>{state.fieldErrors?.email}</FieldError>
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" name="role" defaultValue="RESEARCHER">
              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
            <FieldError>{state.fieldErrors?.password}</FieldError>
          </div>
          <SubmitButton pendingLabel="Creating...">Create user</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
