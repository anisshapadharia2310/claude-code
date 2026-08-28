import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CallForm } from '@/components/outreach/call-form';
import { ScoreBreakdown } from '@/components/score/score-breakdown';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert, PageHeader } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { buildTimeline } from '@/domain/engagement';
import { localTimeFor } from '@/domain/scoring';
import { readBreakdown } from '@/lib/score-breakdown';
import { formatDate, formatDateTime, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { getRepository } from '@/server/repo';
import { complianceFor } from '@/server/services/compliance-view';
import { CALL_OUTCOMES } from '@/server/services/outreach';

export const metadata: Metadata = { title: 'Work contact' };

export default async function OutreachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('viewOutreach');
  const { id } = await params;

  const repo = await getRepository();
  const link = await repo.getCampaignContact(id);
  if (!link) notFound();

  const contact = link.contact;
  const account = contact.account;
  const compliance = await complianceFor(repo, link);
  const breakdown = readBreakdown(link.scoreBreakdown);

  const [events, calls] = await Promise.all([
    repo.listEvents({ campaignId: link.campaignId, contactId: link.contactId }),
    repo.listCallActivities(link.id),
  ]);
  const timeline = buildTimeline(events);

  const now = new Date();
  const localNow = localTimeFor(now, contact.timeZone);
  const localEvent = link.campaign.eventDate ? localTimeFor(link.campaign.eventDate, contact.timeZone) : null;

  const canCall = compliance.allowedChannels.includes('PHONE');
  const canEmail = compliance.allowedChannels.includes('EMAIL');
  const canWhatsApp = compliance.allowedChannels.includes('WHATSAPP');
  const callBlockReason = compliance.blockedChannels.find((entry) => entry.channel === 'PHONE')?.reason;

  const outcomes = Object.entries(CALL_OUTCOMES).map(([value, config]) => ({
    value, label: config.label, tone: config.tone, hint: config.hint,
  }));

  return (
    <>
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={
          <>
            {contact.jobTitle} at{' '}
            <Link href={`/accounts/${account.id}`} className="text-brand-700 underline">{account.companyName}</Link>
            {' '}&middot; {contact.city ? `${contact.city}, ` : ''}{contact.country}
          </>
        }
        actions={
          <>
            <PriorityBadge priority={link.priority} pending={link.priority === 'P1' && link.humanReviewStatus !== 'APPROVED'} />
            <ButtonLink href={`/email/${link.id}`} variant={canEmail ? 'primary' : 'outline'} size="sm">Email</ButtonLink>
            <ButtonLink href={`/whatsapp/${link.id}`} variant="outline" size="sm">WhatsApp</ButtonLink>
            <ButtonLink href={`/contacts/${link.id}`} variant="ghost" size="sm">Full record</ButtonLink>
          </>
        }
      />

      {compliance.doNotContact ? (
        <Alert tone="danger" title="Do not contact" className="mb-4">
          Every channel is blocked for this contact. No outreach may be attempted.
        </Alert>
      ) : compliance.status === 'HOLD' ? (
        <Alert tone="warning" title="Compliance hold" className="mb-4">
          {compliance.summary} Complete the record before contacting this person.
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Why you are calling"
              description="The specific reason this person is on the list."
            />
            <CardBody className="space-y-3 text-sm">
              <p className="leading-relaxed text-navy-800">
                {link.whyThisContact ?? link.whyThisContactDraft ?? 'No justification recorded.'}
              </p>
              {account.recentBusinessTrigger ? (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Business trigger</p>
                  <p className="mt-0.5 leading-relaxed text-amber-900">{account.recentBusinessTrigger}</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Verification: {humanize(account.triggerVerification)}
                    {account.triggerDate ? ` · recorded ${formatDate(account.triggerDate)}` : ''}
                  </p>
                </div>
              ) : null}
              <div className="rounded border border-line bg-navy-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Recommended next action</p>
                <p className="mt-0.5 leading-relaxed text-navy-800">{link.recommendedNextAction ?? '-'}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Call opening" description="Adapt it; do not read it." />
            <CardBody>
              <blockquote className="border-l-4 border-brand-300 bg-brand-50/50 px-4 py-3 text-sm leading-relaxed text-navy-800">
                {link.callerOpening ?? 'No opening available.'}
              </blockquote>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Record the outcome"
              description="Writes the engagement event, moves the status and sets the follow-up in one step."
            />
            <CardBody>
              <CallForm
                campaignContactId={link.id}
                outcomes={outcomes}
                disabled={!canCall}
                disabledReason={callBlockReason ?? 'Calling is not permitted for this contact.'}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Call history" />
            <CardBody className="p-0">
              <TableWrap>
                <Table>
                  <thead><tr><Th>When</Th><Th>Outcome</Th><Th>Notes</Th><Th>Next</Th></tr></thead>
                  <tbody>
                    {calls.map((call) => (
                      <Tr key={call.id}>
                        <Td className="whitespace-nowrap">{formatDateTime(call.callDate)}</Td>
                        <Td><Badge tone="neutral">{humanize(call.outcome)}</Badge></Td>
                        <Td className="max-w-sm text-xs">{call.notes ?? '-'}</Td>
                        <Td className="text-xs">
                          {call.nextAction ?? '-'}
                          {call.nextFollowUpAt ? <p className="text-navy-500">{formatDate(call.nextFollowUpAt)}</p> : null}
                        </Td>
                      </Tr>
                    ))}
                    {calls.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-navy-500">No calls logged yet.</td></tr>
                    ) : null}
                  </tbody>
                </Table>
              </TableWrap>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Score breakdown" description="So you can answer 'why are you calling me' honestly." />
            <CardBody>
              {breakdown ? <ScoreBreakdown breakdown={breakdown} /> : <p className="text-sm text-navy-500">Not scored yet.</p>}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Reach" />
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Local time now</p>
                <p className="text-lg font-semibold text-navy-900">{localNow ?? 'Unknown time zone'}</p>
                <p className="text-xs text-navy-500">{contact.timeZone ?? 'No time zone on record'}</p>
              </div>
              {localEvent ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Event, their local time</p>
                  <p className="font-medium text-navy-800">{localEvent}</p>
                </div>
              ) : null}
              <div className="border-t border-line pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Phone</p>
                <p className={canCall ? 'font-medium text-navy-900' : 'text-navy-400'}>
                  {contact.phoneNumber ?? 'None on record'}
                </p>
                {!canCall ? <p className="text-xs text-rose-700">{callBlockReason}</p> : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Email</p>
                <p className={canEmail ? 'font-medium text-navy-900' : 'text-navy-400'}>
                  {contact.workEmail ?? 'None on record'}
                </p>
                {!canEmail ? (
                  <p className="text-xs text-rose-700">
                    {compliance.blockedChannels.find((entry) => entry.channel === 'EMAIL')?.reason}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">WhatsApp</p>
                <p className={canWhatsApp ? 'font-medium text-emerald-700' : 'text-navy-400'}>
                  {canWhatsApp ? 'Permitted and opted in' : humanize(contact.whatsappStatus)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-navy-500">{link.whatsappRecommendation}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Email angle" />
            <CardBody>
              <p className="text-sm leading-relaxed text-navy-700">{link.emailAngle ?? '-'}</p>
              <ButtonLink href={`/email/${link.id}`} size="sm" className="mt-3 w-full" variant={canEmail ? 'primary' : 'outline'}>
                Open the email workspace
              </ButtonLink>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Engagement" description={`${timeline.length} signals recorded.`} />
            <CardBody className="p-0">
              <ol className="max-h-96 divide-y divide-line overflow-y-auto">
                {timeline.slice(0, 20).map((entry) => (
                  <li key={entry.id} className="px-5 py-2.5">
                    <p className="text-sm text-navy-800">{entry.label}</p>
                    <p className="text-xs text-navy-500">{formatDateTime(entry.occurredAt)}</p>
                  </li>
                ))}
                {timeline.length === 0 ? (
                  <li className="px-5 py-8 text-center text-sm text-navy-500">No engagement yet.</li>
                ) : null}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
