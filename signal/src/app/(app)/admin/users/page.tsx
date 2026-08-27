import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth';
import { CreateUserForm, ToggleUserButton } from '@/components/user-forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, humanize } from '@/lib/utils';

export default async function UsersPage() {
  await requireCapability('user:manage');

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { assignedCampaignContacts: true, callActivities: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Users and roles</h1>
        <p className="text-sm text-muted-foreground">
          Access is granted by capability, not by page. The same capability map is enforced in the
          navigation, on every page, and in every API route.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>{users.length} accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-xs">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="info">{humanize(user.role)}</Badge>
                    </TableCell>
                    <TableCell className="numeric text-right">
                      {user._count.assignedCampaignContacts}
                    </TableCell>
                    <TableCell className="numeric text-right">{user._count.callActivities}</TableCell>
                    <TableCell className="text-xs">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'success' : 'muted'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ToggleUserButton userId={user.id} isActive={user.isActive} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add a user</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capability matrix</CardTitle>
          <CardDescription>What each role can do.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(PERMISSIONS).map(([role, capabilities]) => (
              <div key={role} className="rounded border border-navy-200 p-3">
                <p className="mb-1 text-sm font-semibold text-navy-900">{humanize(role)}</p>
                <ul className="space-y-0.5">
                  {(capabilities as readonly string[]).map((capability) => (
                    <li key={capability} className="text-[11px] text-muted-foreground">
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
