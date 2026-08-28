import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GateChecks } from '@/components/score/gate-checks';
import { ScoreBreakdown } from '@/components/score/score-breakdown';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert, PageHeader, Separator } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { buildTimeline, EVENT_TYPE_LABELS } from '@/domain/engagement';
import { localTimeFor } from '@/domain/scoring';
import { ROLE_CATEGORY_DESCRIPTIONS, ROLE_CATEGORY_LABELS } from '@/domain/taxonomy';
import { readBreakdown } from '@/lib/score-breakdown';
import { formatDate, formatDateTime, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';
import type { RoleCategory } from '@prisma/client';

export const metadata: Metadata = { title: 'Contact' };

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('viewContacts');
  const { id } = await params;

  const repo = await getRepository();
  const link = await repo.getCampaignContact(id);
  if (!link) notFound();

  const contact = link.contact;
  const account = contact.account;
  const breakdown = readBreakdown(link.scoreBreakdown);

  const [events, calls, emails, whatsapps, audits] = await Promise.all([
    repo.listEvents({ campaignId: link.campaignId, contactId: link.contactId }),
    repo.listCallActivities(link.id),
    repo.listEmailActivities(link.id),
    repo.listWhatsAppActivities(link.id),
    repo.listScoreAudits(link.id),
  ]);

  const timeline = buildTimeline(events);
  const localTime = localTimeFor(new Date(), contact.timeZone);
  const isP1 = link.priority === 'P1';

  return (
    <>
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={
          <>
            {contact.jobTitle} at{' '}
            <Link href={`/accounts/${account.id}`} className="text-brand-700 underline">{account.companyName}</Link>
            {' '}&middot; {account.industry} &middot; {contact.city ? `${contact.city}, ` : ''}{contact.country}
            {localTime ? <> &middot; local time {localTime}</> : null}
          </>
        }
        actions={
          <>
            <PriorityBadge priority={link.priority} pending={isP1 && link.humanReviewStatus !== 'APPROVED'} />
            {can(user.role, 'viewOutreach') ? (
              <ButtonLink href={`/outreach/${link.id}`} size="sm">Open in outreach</ButtonLink>
            ) : null}
            {can(user.role, 'reviewContacts') ? (
              <ButtonLink href={`/review?focus=${link.id}`} variant="outline" size="sm">Review</ButtonLink>
            ) : null}
          </>
        }
      />

      {link.gateFailureReasons.length > 0 ? (
        <Alert tone="danger" title="This contact failed the relevance or compliance gate" className="mb-4">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {link.gateFailureReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </Alert>
      ) : null}

      {isP1 && link.humanReviewStatus !== 'APPROVED' ? (
        <Alert tone="warning" title="P1 pending approval" className="mb-4">
          The engine scored this contact P1. It cannot be worked or exported as an approved P1 until a
          written &ldquo;why this contact&rdquo; justification exists and a manager approves it.
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Why this contact"
              description={link.whyThisContact ? 'Written by a person and required before P1 approval.' : 'No human justification written yet.'}
            />
            <CardBody>
              {link.whyThisContact ? (
                <p className="text-sm leading-relaxed text-navy-800">{link.whyThisContact}</p>
              ) : (
                <p className="text-sm text-navy-500">
                  Not yet written. A P1 requires one before approval.
                </p>
              )}

              {link.whyThisContactDraft ? (
                <>
                  <Separator />
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-500">
                    Engine draft
                  </p>
                  <p className="text-sm leading-relaxed text-navy-600">{link.whyThisContactDraft}</p>
                  <p className="mt-2 text-xs text-navy-400">
                    A generated draft never satisfies the P1 justification rule on its own.
                  </p>
                </>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Score breakdown"
              description="Every point, the evidence behind it, and the record fields it came from."
            />
            <CardBody>
              {breakdown
                ? <ScoreBreakdown breakdown={breakdown} />
                : <p className="text-sm text-navy-500">This contact has not been scored yet.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Relevance and compliance gates"
              description="The gates run before any priority is assigned. A high score never rescues a failed gate."
            />
            <CardBody>
              <GateChecks checks={breakdown?.gateChecks ?? []} />
              {breakdown ? (
                <>
                  <Separator />
                  <p className="text-sm font-medium text-navy-800">Compliance: {breakdown.compliance.summary}</p>
                  {breakdown.compliance.blockedChannels.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-navy-600">
                      {breakdown.compliance.blockedChannels.map((entry) => (
                        <li key={entry.channel}>
                          <span className="font-medium">{humanize(entry.channel)} blocked:</span> {entry.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Engagement timeline" description={`${timeline.length} recorded signals on this campaign.`} />
            <CardBody className="p-0">
              {timeline.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-navy-500">No engagement recorded yet.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {timeline.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${entry.negative ? 'bg-rose-500' : 'bg-brand-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy-800">{entry.label}</p>
                        <p className="text-xs text-navy-500">{formatDateTime(entry.occurredAt)}</p>
                      </div>
                      {entry.pointsAwarded > 0 ? (
                        <span className="tabular text-xs font-semibold text-emerald-700">+{entry.pointsAwarded}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Outreach history" description="Calls, emails and WhatsApp messages logged against this campaign." />
            <CardBody className="p-0">
              <TableWrap>
                <Table>
                  <thead>
                    <tr><Th>When</Th><Th>Channel</Th><Th>Detail</Th><Th>Outcome</Th></tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => (
                      <Tr key={call.id}>
                        <Td className="whitespace-nowrap">{formatDateTime(call.callDate)}</Td>
                        <Td>Call</Td>
                        <Td className="max-w-md">{call.notes ?? '-'}{call.nextAction ? <p className="mt-1 text-xs text-navy-500">Next: {call.nextAction}</p> : null}</Td>
                        <Td><Badge tone="neutral">{humanize(call.outcome)}</Badge></Td>
                      </Tr>
                    ))}
                    {emails.map((email) => (
                      <Tr key={email.id}>
                        <Td className="whitespace-nowrap">{formatDateTime(email.sentAt ?? email.createdAt)}</Td>
                        <Td>Email</Td>
                        <Td className="max-w-md"><p className="font-medium">{email.subject}</p></Td>
                        <Td><Badge tone="neutral">{humanize(email.deliveryStatus)}</Badge></Td>
                      </Tr>
                    ))}
                    {whatsapps.map((message) => (
                      <Tr key={message.id}>
                        <Td className="whitespace-nowrap">{formatDateTime(message.sentAt ?? message.createdAt)}</Td>
                        <Td>WhatsApp</Td>
                        <Td className="max-w-md">{message.messageText.slice(0, 140)}</Td>
                        <Td><Badge tone="neutral">{humanize(message.deliveryStatus)}</Badge></Td>
                      </Tr>
                    ))}
                    {calls.length + emails.length + whatsapps.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-navy-500">Nothing logged yet.</td></tr>
                    ) : null}
                  </tbody>
                </Table>
              </TableWrap>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Score history" description="Append-only. Score changes are never overwritten." />
            <CardBody className="p-0">
              <TableWrap>
                <Table>
                  <thead>
                    <tr><Th>When</Th><Th>Change</Th><Th>Reason</Th><Th>Detail</Th></tr>
                  </thead>
                  <tbody>
                    {audits.slice(0, 25).map((audit) => (
                      <Tr key={audit.id}>
                        <Td className="whitespace-nowrap">{formatDateTime(audit.createdAt)}</Td>
                        <Td className="tabular whitespace-nowrap">
                          {audit.previousTotal ?? '-'} &rarr; {audit.newTotal}
                          <p className="text-xs text-navy-500">{audit.previousPriority ?? 'unscored'} &rarr; {audit.newPriority}</p>
                        </Td>
                        <Td>{humanize(audit.reason)}</Td>
                        <Td className="max-w-md text-xs text-navy-600">{audit.detail ?? '-'}</Td>
                      </Tr>
                    ))}
                    {audits.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-navy-500">No score history yet.</td></tr>
                    ) : null}
                  </tbody>
                </Table>
              </TableWrap>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Recommended actions" description="Different by priority band, not a single template." />
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Channel</p>
                <p className="text-navy-800">{link.recommendedChannel ? humanize(link.recommendedChannel) : 'No permitted channel'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Next action</p>
                <p className="leading-relaxed text-navy-700">{link.recommendedNextAction ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Call opening</p>
                <p className="leading-relaxed text-navy-700">{link.callerOpening ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Email angle</p>
                <p className="leading-relaxed text-navy-700">{link.emailAngle ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">WhatsApp</p>
                <p className="leading-relaxed text-navy-700">{link.whatsappRecommendation ?? '-'}</p>
              </div>
            </CardBody>
          </Card>

          {breakdown?.accountSignal?.message ? (
            <Card>
              <CardHeader title="Account signal" description="Shown separately, never folded into the contact score." />
              <CardBody>
                <Badge tone="success">{breakdown.accountSignal.message}</Badge>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-navy-600">
                  <div><dt className="text-navy-500">In campaign</dt><dd className="tabular font-medium">{breakdown.accountSignal.contactsInCampaign}</dd></div>
                  <div><dt className="text-navy-500">Registered</dt><dd className="tabular font-medium">{breakdown.accountSignal.registered}</dd></div>
                  <div><dt className="text-navy-500">Attended</dt><dd className="tabular font-medium">{breakdown.accountSignal.attended}</dd></div>
                  <div><dt className="text-navy-500">Meetings</dt><dd className="tabular font-medium">{breakdown.accountSignal.meetingsRequested}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-navy-500">
                  Account multiplier {breakdown.accountSignal.multiplier.toFixed(2)}&times; is a display signal only.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Role classification" />
            <CardBody className="space-y-2 text-sm">
              <p className="font-medium text-navy-800">{ROLE_CATEGORY_LABELS[contact.roleCategory as RoleCategory]}</p>
              <p className="text-xs text-navy-500">{ROLE_CATEGORY_DESCRIPTIONS[contact.roleCategory as RoleCategory]}</p>
              <dl className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div><dt className="text-navy-500">Seniority</dt><dd className="font-medium text-navy-800">{humanize(contact.seniority)}</dd></div>
                <div><dt className="text-navy-500">Decision role</dt><dd className="font-medium text-navy-800">{humanize(contact.decisionRole)}</dd></div>
                <div><dt className="text-navy-500">Owns budget</dt><dd className="font-medium text-navy-800">{contact.ownsBudget ? 'Yes' : 'No'}</dd></div>
                <div><dt className="text-navy-500">Influences decision</dt><dd className="font-medium text-navy-800">{contact.influencesDecision ? 'Yes' : 'No'}</dd></div>
                <div><dt className="text-navy-500">Direct responsibility</dt><dd className="font-medium text-navy-800">{contact.directProblemResponsibility ? 'Confirmed' : 'Not confirmed'}</dd></div>
                <div><dt className="text-navy-500">Role confidence</dt><dd className="font-medium text-navy-800">{humanize(contact.roleConfidence)}</dd></div>
                <div><dt className="text-navy-500">Department</dt><dd className="font-medium text-navy-800">{contact.department ?? '-'}</dd></div>
                <div><dt className="text-navy-500">Tenure</dt><dd className="font-medium text-navy-800">{contact.tenureMonths ? `${contact.tenureMonths} months` : '-'}</dd></div>
              </dl>
              <p className="pt-2 font-mono text-[11px] text-navy-500">
                Normalized title: {contact.normalizedJobTitle || '(empty)'}
              </p>
              {contact.roleRelevanceNotes ? (
                <p className="text-xs leading-relaxed text-navy-600">{contact.roleRelevanceNotes}</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Reachability and permission" />
            <CardBody>
              <dl className="space-y-2 text-xs">
                <div><dt className="text-navy-500">Work email</dt><dd className="font-medium text-navy-800">{contact.workEmail ?? '-'} <span className="font-normal text-navy-500">({humanize(contact.emailStatus)})</span></dd></div>
                <div><dt className="text-navy-500">Phone</dt><dd className="font-medium text-navy-800">{contact.phoneNumber ?? '-'} <span className="font-normal text-navy-500">({humanize(contact.phoneStatus)})</span></dd></div>
                <div><dt className="text-navy-500">WhatsApp</dt><dd className="font-medium text-navy-800">{humanize(contact.whatsappStatus)}</dd></div>
                <div><dt className="text-navy-500">Consent</dt><dd className="font-medium text-navy-800">{humanize(contact.consentStatus)}</dd></div>
                <div><dt className="text-navy-500">Source</dt><dd className="font-medium text-navy-800">{contact.contactSource ?? 'Not recorded'}</dd></div>
                <div><dt className="text-navy-500">Last verified</dt><dd className="font-medium text-navy-800">{formatDate(contact.lastVerifiedAt)}</dd></div>
                <div><dt className="text-navy-500">Time zone</dt><dd className="font-medium text-navy-800">{contact.timeZone ?? '-'}</dd></div>
              </dl>
              {can(user.role, 'viewCompliance') ? (
                <ButtonLink href={`/compliance?contactId=${contact.id}`} variant="outline" size="sm" className="mt-3 w-full">
                  Open compliance record
                </ButtonLink>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Account" />
            <CardBody className="space-y-2 text-xs">
              <p className="text-sm font-medium text-navy-800">{account.companyName}</p>
              <p className="text-navy-500">{account.industry}{account.subIndustry ? ` · ${account.subIndustry}` : ''}</p>
              <p className="text-navy-500">{humanize(account.employeeBand)} employees · {humanize(account.revenueBand)}</p>
              {account.recentBusinessTrigger ? (
                <p className="rounded bg-amber-50 px-2 py-1.5 leading-relaxed text-amber-900">
                  <span className="font-semibold">Trigger: </span>{account.recentBusinessTrigger}
                  <span className="block mt-1 text-[11px]">Verification: {humanize(account.triggerVerification)}</span>
                </p>
              ) : <p className="text-navy-400">No business trigger recorded.</p>}
              <ButtonLink href={`/accounts/${account.id}`} variant="outline" size="sm" className="mt-2 w-full">
                Open account
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
