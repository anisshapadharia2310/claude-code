import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Alert, PageHeader, Stat } from '@/components/ui/misc';
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { computeAccountSignal } from '@/domain/account-signal';
import { formatDate, formatNumber, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('viewAccounts');
  const { id } = await params;

  const repo = await getRepository();
  const account = await repo.getAccount(id);
  if (!account) notFound();

  const campaign = await getSelectedCampaign();
  const links = campaign ? await repo.listCampaignContacts(campaign.id) : [];
  const accountLinks = links.filter((link) => link.contact.accountId === id);

  const events = campaign
    ? await repo.listEvents({ campaignId: campaign.id, contactIds: accountLinks.map((link) => link.contactId) })
    : [];
  const eventsByContact = new Map<string, typeof events>();
  for (const event of events) {
    const list = eventsByContact.get(event.contactId) ?? [];
    list.push(event);
    eventsByContact.set(event.contactId, list);
  }

  const signal = computeAccountSignal({
    accountId: account.id,
    companyName: account.companyName,
    contacts: accountLinks.map((link) => ({
      contactId: link.contactId,
      events: eventsByContact.get(link.contactId) ?? [],
    })),
  });

  const triggers: Array<[string, boolean, string]> = [
    ['Transformation or implementation programme', account.transformationActivity, 'Band C, 5 points'],
    ['Relevant hiring activity', account.relevantOpenJobPostings > 0, `${account.relevantOpenJobPostings} open roles · band C, 5 points`],
    ['Expansion or restructuring', account.expansionActivity, 'Band C, 3 points'],
    ['Merger or acquisition', account.mergerOrAcquisitionActivity, 'Band C, 3 points'],
    ['Leadership change', account.leadershipChange, 'Band C, 2 points'],
    ['Regulatory or operational pressure', account.regulatoryPressure, 'Band C, 3 points'],
    ['Publicly stated priority', Boolean(account.publiclyStatedPriority), 'Band C, 2 points'],
  ];

  return (
    <>
      <PageHeader
        eyebrow={account.namedAccountStatus ? 'Named strategic account' : 'Account'}
        title={account.companyName}
        description={
          <>
            {account.industry}{account.subIndustry ? ` · ${account.subIndustry}` : ''} &middot;{' '}
            {account.city ? `${account.city}, ` : ''}{account.country} &middot; {account.domain ?? 'no domain'}
          </>
        }
        actions={account.namedAccountStatus ? <Badge tone="brand">Named strategic account</Badge> : null}
      />

      {signal.message ? (
        <Alert tone="success" className="mb-4" title={signal.message}>
          {signal.registered} registered, {signal.attended} attended, {signal.engaged} engaged and{' '}
          {signal.meetingsRequested} asked for a meeting, out of {signal.contactsInCampaign} contacts in this
          campaign. This is shown as an account signal only; it is never folded into an individual score.
        </Alert>
      ) : null}

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Contacts" value={formatNumber(account.contacts.length)} />
        <Stat label="In campaign" value={formatNumber(accountLinks.length)} />
        <Stat label="P1" value={formatNumber(accountLinks.filter((link) => link.priority === 'P1').length)} tone="p1" />
        <Stat label="Registered" value={formatNumber(signal.registered)} />
        <Stat label="Attended" value={formatNumber(signal.attended)} />
        <Stat label="Account multiplier" value={`${signal.multiplier.toFixed(2)}x`}
          tooltip="A display signal for account-level interest. It never changes a contact score." />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Contacts in this campaign"
            description={campaign ? campaign.name : 'No campaign selected'}
            icon={<Icon name="contacts" className="h-4 w-4" />}
          />
          <CardBody className="p-0">
            <TableWrap>
              <Table>
                <thead>
                  <tr><Th>Priority</Th><Th numeric>Score</Th><Th>Contact</Th><Th>Role</Th><Th>Status</Th></tr>
                </thead>
                <tbody>
                  {accountLinks.length === 0 ? <EmptyRow colSpan={5}>No contacts from this account are in the selected campaign.</EmptyRow> : null}
                  {accountLinks.map((link) => (
                    <Tr key={link.id}>
                      <Td><PriorityBadge priority={link.priority} pending={link.priority === 'P1' && link.humanReviewStatus !== 'APPROVED'} /></Td>
                      <Td numeric className="font-semibold">{link.totalScore}</Td>
                      <Td>
                        <Link href={`/contacts/${link.id}`} className="font-medium text-brand-700 hover:underline">
                          {link.contact.firstName} {link.contact.lastName}
                        </Link>
                        <p className="text-xs text-navy-500">{link.contact.jobTitle}</p>
                      </Td>
                      <Td className="text-xs">
                        {humanize(link.contact.roleCategory)}
                        <p className="text-navy-500">{humanize(link.contact.seniority)}</p>
                      </Td>
                      <Td className="text-xs">{humanize(link.currentStatus)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Business triggers"
              description={`Verification: ${humanize(account.triggerVerification)}`}
              icon={<Icon name="spark" className="h-4 w-4" />}
            />
            <CardBody className="space-y-2">
              {account.recentBusinessTrigger ? (
                <p className="rounded-lg border border-warn-200 bg-warn-50 px-3.5 py-2.5 text-sm leading-relaxed text-warn-900">
                  {account.recentBusinessTrigger}
                </p>
              ) : null}
              {account.publiclyStatedPriority ? (
                <p className="text-xs leading-relaxed text-navy-600">
                  <span className="font-semibold">Publicly stated: </span>{account.publiclyStatedPriority}
                </p>
              ) : null}
              <ul className="space-y-1.5 pt-2">
                {triggers.map(([label, present, weight]) => (
                  <li key={label} className="flex items-start gap-2 text-xs">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${present ? 'bg-success-500' : 'bg-navy-200'}`} />
                    <span className={present ? 'text-navy-800' : 'text-navy-400'}>
                      {label}
                      <span className="block text-[10px] text-navy-400">{weight}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {account.triggerSourceUrl ? (
                <p className="pt-2 text-xs">
                  <a href={account.triggerSourceUrl} target="_blank" rel="noreferrer noopener" className="text-brand-700 underline">
                    Trigger source
                  </a>
                  {account.triggerDate ? <span className="text-navy-500"> &middot; {formatDate(account.triggerDate)}</span> : null}
                </p>
              ) : <p className="pt-2 text-xs text-amber-700">No trigger source recorded.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Company profile" icon={<Icon name="building" className="h-4 w-4" />} />
            <CardBody>
              <dl className="space-y-2 text-xs">
                <div><dt className="text-navy-500">Employees</dt><dd className="font-medium text-navy-800">{humanize(account.employeeBand)}</dd></div>
                <div><dt className="text-navy-500">Revenue</dt><dd className="font-medium text-navy-800">{humanize(account.revenueBand)}</dd></div>
                <div><dt className="text-navy-500">Locations</dt><dd className="font-medium text-navy-800">{account.numberOfLocations ?? '-'}</dd></div>
                <div><dt className="text-navy-500">Relationship</dt><dd className="font-medium text-navy-800">{humanize(account.existingClientRelationship)}</dd></div>
                <div><dt className="text-navy-500">Language</dt><dd className="font-medium text-navy-800">{account.language ?? '-'}</dd></div>
                <div><dt className="text-navy-500">Time zone</dt><dd className="font-medium text-navy-800">{account.timeZone ?? '-'}</dd></div>
                <div><dt className="text-navy-500">Data confidence</dt><dd className="font-medium text-navy-800">{humanize(account.accountDataConfidence)}</dd></div>
              </dl>
              {account.existingTechnology.length > 0 ? (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-navy-500">Technology</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {account.existingTechnology.map((tech) => <Badge key={tech} tone="neutral">{tech}</Badge>)}
                  </div>
                </>
              ) : null}
              {account.competitorTechnology.length > 0 ? (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-navy-500">Competitor technology</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {account.competitorTechnology.map((tech) => <Badge key={tech} tone="warning">{tech}</Badge>)}
                  </div>
                </>
              ) : null}
              {account.accountNotes ? (
                <p className="mt-3 text-xs leading-relaxed text-navy-600">{account.accountNotes}</p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
