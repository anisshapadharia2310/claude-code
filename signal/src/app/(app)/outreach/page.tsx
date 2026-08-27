import Link from 'next/link';
import { Channel, Priority } from '@prisma/client';
import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PriorityBadge } from '@/components/priority-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { formatDate, humanize, isCallableNow, localTime } from '@/lib/utils';

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string; campaign?: string }>;
}) {
  const user = await requireCapability('outreach:perform');
  const params = await searchParams;
  const mineOnly = params.mine !== '0';

  const rows = await prisma.campaignContact.findMany({
    where: {
      ...(mineOnly ? { assignedToId: user.id } : {}),
      ...(params.campaign ? { campaignId: params.campaign } : {}),
      priority: { in: [Priority.P1, Priority.P2, Priority.P3] },
      currentStatus: { notIn: ['DO_NOT_CONTACT', 'REJECTED', 'NOT_INTERESTED'] },
    },
    include: {
      contact: { include: { account: { select: { companyName: true, recentBusinessTrigger: true } } } },
      campaign: { select: { name: true, topic: true } },
    },
    orderBy: [{ priority: 'asc' }, { totalScore: 'desc' }],
    take: 100,
  });

  const callableNow = rows.filter((row) => isCallableNow(row.contact.timeZone)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Outreach worklist</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} contacts in the queue &middot; {callableNow} are inside working hours right
            now.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant={mineOnly ? 'default' : 'outline'}>
            <Link href="/outreach?mine=1">Assigned to me</Link>
          </Button>
          <Button asChild size="sm" variant={mineOnly ? 'outline' : 'default'}>
            <Link href="/outreach?mine=0">All contacts</Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing in your worklist"
          description="Switch to all contacts, or ask a manager to assign work to you."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Queue</CardTitle>
            <CardDescription>
              Ordered by priority, then score. Local time is shown so you dial at a sensible hour.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Local time</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Next action</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const callable = isCallableNow(row.contact.timeZone);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <PriorityBadge priority={row.priority} />
                        <span className="numeric ml-1 text-xs text-muted-foreground">{row.totalScore}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-navy-900">
                          {row.contact.firstName} {row.contact.lastName}
                        </span>
                        <span className="block text-xs text-muted-foreground">{row.contact.jobTitle}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.contact.account.companyName}
                        <span className="block text-xs text-muted-foreground">{row.contact.country}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={callable ? 'success' : 'muted'}>
                          {localTime(row.contact.timeZone)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.recommendedChannel === Channel.PHONE ? 'info' : 'muted'}>
                          {row.recommendedChannel ? humanize(row.recommendedChannel) : 'None'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground">
                        {row.recommendedNextAction}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(row.nextFollowUpAt)}</TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/outreach/${row.id}`}>Work</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
