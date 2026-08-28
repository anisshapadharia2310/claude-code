import type { Metadata } from 'next';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Checkbox, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { updateUserAction } from '@/server/actions/admin';
import { requirePermission } from '@/server/auth/guards';
import { ALL_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage() {
  const actor = await requirePermission('manageUsers');
  const repo = await getRepository();
  const users = await repo.listUsers();

  return (
    <>
      <PageHeader title="Users" description="Roles decide which screens and actions each person can reach." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title="Team" description={`${users.length} accounts`} />
          <CardBody className="p-0">
            <TableWrap>
              <Table>
                <thead>
                  <tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Active</Th><Th>Created</Th><Th /></tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <Tr key={user.id}>
                      <Td className="font-medium">{user.name}{user.id === actor.id ? <Badge tone="brand" className="ml-2">You</Badge> : null}</Td>
                      <Td className="text-xs">{user.email}</Td>
                      <Td colSpan={3}>
                        <ActionForm action={updateUserAction} feedbackPosition="none" className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <Select name="role" defaultValue={user.role} className="h-8 w-36 text-xs" disabled={user.id === actor.id}>
                            {ALL_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                          </Select>
                          <label className="flex items-center gap-1.5 text-xs text-navy-600">
                            <Checkbox name="isActive" defaultChecked={user.isActive} />
                            Active
                          </label>
                          <span className="text-xs text-navy-500">{formatDate(user.createdAt)}</span>
                          <SubmitButton size="sm" variant="secondary" pendingLabel="Saving...">Save</SubmitButton>
                        </ActionForm>
                      </Td>
                      <Td />
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Add a user" />
            <CardBody>
              <CreateUserForm
                roles={ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="What each role can do" />
            <CardBody>
              <dl className="space-y-3 text-xs">
                {ALL_ROLES.map((role) => (
                  <div key={role}>
                    <dt className="font-semibold text-navy-800">{ROLE_LABELS[role]}</dt>
                    <dd className="text-navy-600">{ROLE_DESCRIPTIONS[role]}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
