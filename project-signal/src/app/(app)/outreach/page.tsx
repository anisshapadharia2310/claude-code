import type { Metadata } from 'next';
import Link from 'next/link';
import { PriorityBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { EmptyState, PageHeader, Stat } from '@/components/ui/misc';
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { localTimeFor } from '@/domain/scoring';
import { cn, formatDate, formatNumber, humanize } from '@/lib/utils';
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
  if (!campaign) return <EmptyState title="No campaigns yet" icon="campaigns" />;

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
        eyebrow={campaign.name}
        title="Outreach workspace"
        description={`${formatNumber(rows.length)} workable contacts. Everything in this queue has passed the relevance and compliance gates.`}
      />

      <section aria-label="Queue summary" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="In queue" value={formatNumber(rows.length)} icon="outreach" />
        <Stat label="Due now" value={formatNumber(dueToday)} tone="hold" icon="clock"
          hint="Follow-up date has passed" />
        <Stat label="P1" value={formatNumber(rows.filter((row) => row.priority === 'P1').length)} tone="p1" icon="target" />
        <Stat label="P2" value={formatNumber(rows.filter((row) => row.priority === 'P2').length)} tone="p2" />
      </section>

      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter the queue by owner">
        <ButtonLink href="/outreach?owner=all" variant={scope === 'all' ? 'primary' : 'outline'} size="sm">
          Everyone
        </ButtonLink>
        <ButtonLink href={`/outreach?owner=${user.id}`} variant={scope === user.id ? 'primary' : 'outline'} size="sm" icon="user">
          Mine
        </ButtonLink>
        <ButtonLink href="/outreach?owner=unassigned" variant={scope === 'unassigned' ? 'primary' : 'outline'} size="sm">
          Unassigned
        </ButtonLink>
        {callers.filter((caller) => caller.id !== user.id).map((caller) => (
          <ButtonLink key={caller.id} href={`/outreach?owner=${caller.id}`}
            variant={scope === caller.id ? 'primary' : 'outline'} size="sm">
            {caller.name}
          </ButtonLink>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Call queue"
          description="Ordered by priority, then by when the follow-up is due."
          icon={<Icon name="phone" className="h-4 w-4" />}
        />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th className="w-28">Priority</Th>
                  <Th className="min-w-[200px]">Contact</Th>
                  <Th className="min-w-[260px]">Company and trigger</Th>
                  <Th className="min-w-[150px]">Local time</Th>
                  <Th>Channel</Th>
                  <Th className="min-w-[140px]">Status</Th>
                  <Th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <EmptyRow colSpan={7}>Nothing is queued for this filter.</EmptyRow> : null}
                {rows.slice(0, 200).map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <PriorityBadge
                        priority={row.priority}
                        pending={row.priority === 'P1' && row.humanReviewStatus !== 'APPROVED'}
                        size="sm"
                      />
                      <p className="tabular mt-1.5 text-sm font-semibold text-navy-800">{row.totalScore}<span className="text-xs font-normal text-navy-400">/100</span></p>
                    </Td>
                    <Td>
                      <Link
                        href={`/outreach/${row.id}`}
                        className="rounded text-sm font-semibold text-navy-900 transition-colors hover:text-brand-700 hover:underline"
                      >
                        {row.contact.firstName} {row.contact.lastName}
                      </Link>
                      <p className="mt-0.5 text-xs text-navy-600">{row.contact.jobTitle}</p>
                    </Td>
                    <Td className="max-w-[320px]">
                      <p className="text-sm text-navy-800">{row.contact.account.companyName}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-navy-500">
                        {row.contact.account.recentBusinessTrigger ?? 'No trigger recorded'}
                      </p>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-navy-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="clock" className="h-3.5 w-3.5 text-navy-400" />
                        {localTimeFor(now, row.contact.timeZone) ?? 'Unknown'}
                      </span>
                    </Td>
                    <Td className="text-xs">
                      {row.recommendedChannel ? (
                        <span className="inline-flex items-center gap-1.5 text-navy-700">
                          <Icon
                            name={row.recommendedChannel === 'PHONE' ? 'phone' : row.recommendedChannel === 'EMAIL' ? 'mail' : 'chat'}
                            className="h-3.5 w-3.5 text-navy-400"
                          />
                          {humanize(row.recommendedChannel)}
                        </span>
                      ) : (
                        <span className="text-navy-400">None permitted</span>
                      )}
                    </Td>
                    <Td className="text-xs">
                      <span className="text-navy-700">{humanize(row.currentStatus)}</span>
                      {row.nextFollowUpAt ? (
                        <p className={cn(
                          'mt-0.5 inline-flex items-center gap-1',
                          row.nextFollowUpAt <= now ? 'font-semibold text-warn-700' : 'text-navy-500',
                        )}>
                          <Icon name="clock" className="h-3 w-3" />
                          Due {formatDate(row.nextFollowUpAt)}
                        </p>
                      ) : null}
                    </Td>
                    <Td>
                      <ButtonLink href={`/outreach/${row.id}`} size="sm" trailingIcon="chevronRight">Work</ButtonLink>
                    </Td>
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
