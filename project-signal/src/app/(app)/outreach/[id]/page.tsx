import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CallForm } from '@/components/outreach/call-form';
import { ScoreBreakdown } from '@/components/score/score-breakdown';
import { ScoreRing } from '@/components/score/score-ring';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Alert, MiniStat, PageHeader } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { buildTimeline } from '@/domain/engagement';
import { localTimeFor } from '@/domain/scoring';
import { readBreakdown } from '@/lib/score-breakdown';
import { cn, formatDate, formatDateTime, humanize } from '@/lib/utils';
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
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-navy-500">
            <Link href="/outreach" className="rounded transition-colors hover:text-brand-700">Outreach</Link>
            <Icon name="chevronRight" className="h-3 w-3 text-navy-300" />
            <span className="text-navy-700">{contact.firstName} {contact.lastName}</span>
          </nav>
        }
        title={`${contact.firstName} ${contact.lastName}`}
        description={
          <>
            {contact.jobTitle} at{' '}
            <Link href={`/accounts/${account.id}`} className="font-medium text-brand-700 underline underline-offset-2">
              {account.companyName}
            </Link>
            {' · '}{contact.city ? `${contact.city}, ` : ''}{contact.country}
          </>
        }
        actions={
          <>
            <ButtonLink
              href={`/email/${link.id}`}
              variant={canEmail ? 'primary' : 'outline'}
              size="sm"
              icon="mail"
            >
              Email
            </ButtonLink>
            <ButtonLink href={`/whatsapp/${link.id}`} variant="outline" size="sm" icon="chat">
              WhatsApp
            </ButtonLink>
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

      {/* ==================================================== caller headline
          Everything a caller needs before dialling, on one line: who, where,
          how good, and when it is reasonable to ring. */}
      <Card className="mb-4" elevation="raised" accent={link.priority === 'P1' ? 'brand' : 'none'}>
        <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <div className="flex items-center gap-4">
            <ScoreRing value={link.totalScore} />
            <div>
              <PriorityBadge
                priority={link.priority}
                pending={link.priority === 'P1' && link.humanReviewStatus !== 'APPROVED'}
              />
              <p className="mt-2 text-xs text-navy-500">
                {humanize(contact.roleCategory)} · {humanize(contact.seniority)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-sunk px-4 py-2.5">
            <Icon name="clock" className="h-5 w-5 shrink-0 text-navy-400" />
            <div>
              <p className="eyebrow">Local time now</p>
              <p className="text-md font-semibold text-navy-900">{localNow ?? 'Unknown time zone'}</p>
              <p className="text-2xs text-navy-500">{contact.timeZone ?? 'No time zone on record'}</p>
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <MiniStat label="Role relevance" value={<>{link.roleRelevanceScore}<span className="text-xs font-normal text-navy-400">/25</span></>} />
            <MiniStat label="Trigger" value={<>{link.triggerScore}<span className="text-xs font-normal text-navy-400">/20</span></>} />
            <MiniStat label="Engagement" value={<>{link.engagementScore}<span className="text-xs font-normal text-navy-400">/15</span></>} />
            <MiniStat
              label="Channel"
              value={<span className="text-md">{link.recommendedChannel ? humanize(link.recommendedChannel) : 'None'}</span>}
            />
          </dl>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card accent="warn">
            <CardHeader
              title="Why you are calling"
              description="The specific reason this person is on the list."
              icon={<Icon name="target" className="h-4 w-4" />}
            />
            <CardBody className="space-y-3">
              <p className="text-md leading-relaxed text-navy-800">
                {link.whyThisContact ?? link.whyThisContactDraft ?? 'No justification recorded.'}
              </p>

              {account.recentBusinessTrigger ? (
                <div className="rounded-lg border border-warn-200 bg-warn-50 px-4 py-3">
                  <p className="eyebrow mb-1 text-warn-800">Business trigger</p>
                  <p className="text-sm leading-relaxed text-warn-900">{account.recentBusinessTrigger}</p>
                  <p className="mt-1.5 text-xs text-warn-800">
                    Verification: {humanize(account.triggerVerification)}
                    {account.triggerDate ? ` · recorded ${formatDate(account.triggerDate)}` : ''}
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
                <p className="eyebrow mb-1 text-brand-800">Recommended next action</p>
                <p className="text-sm leading-relaxed text-brand-900">{link.recommendedNextAction ?? '—'}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Call opening"
              description="Adapt it; do not read it."
              icon={<Icon name="chat" className="h-4 w-4" />}
            />
            <CardBody>
              <blockquote className="rounded-lg border-l-[3px] border-brand-500 bg-brand-50/50 px-4 py-3.5 text-md leading-relaxed text-navy-800">
                {link.callerOpening ?? 'No opening available.'}
              </blockquote>
            </CardBody>
          </Card>

          <Card accent={canCall ? 'success' : 'danger'}>
            <CardHeader
              title="Record the outcome"
              description="Writes the engagement event, moves the status and sets the follow-up in one step."
              icon={<Icon name="phone" className="h-4 w-4" />}
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
            <CardHeader
              title="Call history"
              description={`${calls.length} calls logged.`}
              icon={<Icon name="clock" className="h-4 w-4" />}
            />
            <CardBody className="p-0">
              <TableWrap>
                <Table>
                  <thead><tr><Th>When</Th><Th>Outcome</Th><Th>Notes</Th><Th>Next</Th></tr></thead>
                  <tbody>
                    {calls.map((call) => (
                      <Tr key={call.id}>
                        <Td className="whitespace-nowrap text-xs">{formatDateTime(call.callDate)}</Td>
                        <Td><Badge tone="outline">{humanize(call.outcome)}</Badge></Td>
                        <Td className="max-w-sm text-xs">{call.notes ?? '—'}</Td>
                        <Td className="text-xs">
                          {call.nextAction ?? '—'}
                          {call.nextFollowUpAt ? (
                            <p className="mt-0.5 text-navy-500">{formatDate(call.nextFollowUpAt)}</p>
                          ) : null}
                        </Td>
                      </Tr>
                    ))}
                    {calls.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-10 text-center text-sm text-navy-500">
                          No calls logged yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </Table>
              </TableWrap>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Score breakdown"
              description="So you can answer &ldquo;why are you calling me&rdquo; honestly."
              icon={<Icon name="scoring" className="h-4 w-4" />}
            />
            <CardBody>
              {breakdown ? <ScoreBreakdown breakdown={breakdown} /> : (
                <p className="text-base text-navy-500">Not scored yet.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Reach" icon={<Icon name="phone" className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              {localEvent ? (
                <div className="rounded-lg bg-surface-sunk px-3 py-2.5">
                  <p className="eyebrow mb-0.5">Event, their local time</p>
                  <p className="text-sm font-medium text-navy-800">{localEvent}</p>
                </div>
              ) : null}

              {([
                ['Phone', contact.phoneNumber, canCall, callBlockReason, 'phone'],
                ['Email', contact.workEmail, canEmail, compliance.blockedChannels.find((entry) => entry.channel === 'EMAIL')?.reason, 'mail'],
              ] as const).map(([label, value, allowed, reason, icon]) => (
                <div key={label} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                  <p className="eyebrow mb-1 flex items-center gap-1.5">
                    <Icon name={icon} className="h-3.5 w-3.5" />{label}
                  </p>
                  <p className={cn('break-all text-sm', allowed ? 'font-medium text-navy-900' : 'text-navy-400')}>
                    {value ?? 'None on record'}
                  </p>
                  {!allowed && reason ? (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-danger-700">
                      <Icon name="ban" className="mt-0.5 h-3 w-3 shrink-0" />{reason}
                    </p>
                  ) : null}
                </div>
              ))}

              <div className="border-t border-line pt-3">
                <p className="eyebrow mb-1 flex items-center gap-1.5">
                  <Icon name="chat" className="h-3.5 w-3.5" />WhatsApp
                </p>
                <p className={cn('text-sm font-medium', canWhatsApp ? 'text-success-700' : 'text-navy-400')}>
                  {canWhatsApp ? 'Permitted and opted in' : humanize(contact.whatsappStatus)}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-navy-500">{link.whatsappRecommendation}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Email angle" icon={<Icon name="mail" className="h-4 w-4" />} />
            <CardBody>
              <p className="text-sm leading-relaxed text-navy-700">{link.emailAngle ?? '—'}</p>
              <ButtonLink
                href={`/email/${link.id}`}
                size="sm"
                block
                className="mt-4"
                variant={canEmail ? 'primary' : 'outline'}
                icon="mail"
              >
                Open the email workspace
              </ButtonLink>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Previous activity"
              description={`${timeline.length} signals recorded.`}
              icon={<Icon name="trendUp" className="h-4 w-4" />}
            />
            <CardBody className="p-0">
              <ol className="max-h-96 divide-y divide-line overflow-y-auto">
                {timeline.slice(0, 20).map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2.5 px-5 py-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        entry.negative ? 'bg-danger-500' : 'bg-brand-400',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-navy-800">{entry.label}</p>
                      <p className="text-xs text-navy-500">{formatDateTime(entry.occurredAt)}</p>
                    </div>
                  </li>
                ))}
                {timeline.length === 0 ? (
                  <li className="px-5 py-10 text-center text-sm text-navy-500">No engagement yet.</li>
                ) : null}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
