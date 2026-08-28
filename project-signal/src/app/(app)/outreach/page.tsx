import type { Metadata } from 'next';
import Link from 'next/link';
import { PriorityBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState, PageHeader, Stat } from '@/components/ui/misc';
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { localTimeFor } from '@/domain/scoring';
import { formatDate, formatNumber, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';

export const metadata: Metadata = { title: 'Outreach' };

const WORKABLE = ['P1', 'P2', 'P3'];

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string; priority?: string }>;
}) {
  const user = await requirePermission('viewOutreach');
  const campaign = await getSelectedCampaign();
  if (!campaign) return <EmptyState title="No campaigns yet" />;

  const { owner, priority } = await searchParams;
  const repo = await getRepository();
  const links = await repo.listCampaignContacts(campaign.id);

  // Callers see their own queue by default; managers and admins see everything.
  const scope = owner ?? (user.role === 'CALLER' ? user.id : 'all');
  const now = new Date();

  const rows = links
    .filter((link) => WORKABLE.includes(link.priority))
    .filter((link) => (scope === 'all' ? true : scope === 'unassigned' ? !link.assignedTo : link.assignedTo === scope))
    .filter((link) => (priority ? link.priority === priority : true))
    .filter((link) => link.currentStatus !== 'DO_NOT_CONTACT')
    // Approved P1s first, then by follow-up date, then by score.
    .sort((a, b) => {
      const dueA = a.nextFollowUpAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const dueB = b.nextFollowUpAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (a.priority !== b.priority) return WORKABLE.indexOf(a.priority) - WORKABLE.indexOf(b.priority);
      if (dueA !== dueB) return dueA - dueB;
      return b.totalScore - a.totalScore;
    });

  const dueToday = rows.filter((row) => row.nextFollowUpAt && row.nextFollowUpAt <= now).length;
  const callers = (await repo.listUsers()).filter((entry) => entry.role === 'CALLER' || entry.role === 'MANAGER');

  return (
    <>
      <PageHeader
        title="Outreach workspace"
        description={`${formatNumber(rows.length)} workable contacts in ${campaign.name}. Everything here has passed the relevance and compliance gates.`}
      />

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="In queue" value={formatNumber(rows.length)} />
        <Stat label="Due now" value={formatNumber(dueToday)} tone="hold" />
        <Stat label="P1" value={formatNumber(rows.filter((row) => row.priority === 'P1').length)} tone="p1" />
        <Stat label="P2" value={formatNumber(rows.filter((row) => row.priority === 'P2').length)} tone="p2" />
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        <ButtonLink href="/outreach?owner=all" variant={scope === 'all' ? 'primary' : 'outline'} size="sm">Everyone</ButtonLink>
        <ButtonLink href={`/outreach?owner=${user.id}`} variant={scope === user.id ? 'primary' : 'outline'} size="sm">Mine</ButtonLink>
        <ButtonLink href="/outreach?owner=unassigned" variant={scope === 'unassigned' ? 'primary' : 'outline'} size="sm">Unassigned</ButtonLink>
        {callers.filter((caller) => caller.id !== user.id).map((caller) => (
          <ButtonLink key={caller.id} href={`/outreach?owner=${caller.id}`}
            variant={scope === caller.id ? 'primary' : 'outline'} size="sm">
            {caller.name}
          </ButtonLink>
        ))}
      </div>

      <Card>
        <CardHeader title="Call queue" description="Ordered by priority, then by when the follow-up is due." />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th className="w-24">Priority</Th>
                  <Th>Contact</Th>
                  <Th>Company and trigger</Th>
                  <Th>Local time</Th>
                  <Th>Channel</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <EmptyRow colSpan={7}>Nothing is queued for this filter.</EmptyRow> : null}
                {rows.slice(0, 200).map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <PriorityBadge priority={row.priority} pending={row.priority === 'P1' && row.humanReviewStatus !== 'APPROVED'} />
                      <p className="tabular mt-1 text-xs text-navy-500">{row.totalScore}/100</p>
                    </Td>
                    <Td>
                      <Link href={`/outreach/${row.id}`} className="font-medium text-brand-700 hover:underline">
                        {row.contact.firstName} {row.contact.lastName}
                      </Link>
                      <p className="text-xs text-navy-600">{row.contact.jobTitle}</p>
                    </Td>
                    <Td className="max-w-72">
                      <p className="text-sm text-navy-800">{row.contact.account.companyName}</p>
                      <p className="text-xs leading-snug text-navy-500">
                        {row.contact.account.recentBusinessTrigger ?? 'No trigger recorded'}
                      </p>
                    </Td>
                    <Td className="whitespace-nowrap text-xs">
                      {localTimeFor(now, row.contact.timeZone) ?? 'Unknown'}
                    </Td>
                    <Td className="text-xs">
                      {row.recommendedChannel ? humanize(row.recommendedChannel) : 'None permitted'}
                    </Td>
                    <Td className="text-xs">
                      {humanize(row.currentStatus)}
                      {row.nextFollowUpAt ? (
                        <p className={row.nextFollowUpAt <= now ? 'font-medium text-amber-700' : 'text-navy-500'}>
                          Due {formatDate(row.nextFollowUpAt)}
                        </p>
                      ) : null}
                    </Td>
                    <Td><ButtonLink href={`/outreach/${row.id}`} size="sm">Work</ButtonLink></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>
    </>
  );
}
