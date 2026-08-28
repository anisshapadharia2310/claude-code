import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { RoleCategory } from '@prisma/client';
import { GateChecks } from '@/components/score/gate-checks';
import { ScoreBreakdown } from '@/components/score/score-breakdown';
import { ScoreRing } from '@/components/score/score-ring';
import { Badge, PriorityBadge, StatusDot } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Alert, MiniStat, PageHeader, Progress } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { buildTimeline } from '@/domain/engagement';
import { localTimeFor } from '@/domain/scoring';
import { ROLE_CATEGORY_DESCRIPTIONS, ROLE_CATEGORY_LABELS } from '@/domain/taxonomy';
import { readBreakdown } from '@/lib/score-breakdown';
import { cn, formatDate, formatDateTime, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';

export const metadata: Metadata = { title: 'Contact' };

function reachTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (['VERIFIED', 'VALID', 'AVAILABLE_OPTED_IN'].includes(status)) return 'success';
  if (['UNVERIFIED', 'CATCH_ALL', 'RISKY', 'AVAILABLE_NO_CONSENT'].includes(status)) return 'warning';
  if (['INVALID', 'BOUNCED', 'WRONG_NUMBER', 'DO_NOT_CALL', 'OPTED_OUT', 'BLOCKED_BY_POLICY'].includes(status)) return 'danger';
  return 'neutral';
}

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
  const activityCount = calls.length + emails.length + whatsapps.length;

  return (
    <>
      <PageHeader
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-navy-500">
            <Link href="/contacts" className="rounded transition-colors hover:text-brand-700">Contacts</Link>
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
            {' · '}{account.industry}{' · '}{contact.city ? `${contact.city}, ` : ''}{contact.country}
            {localTime ? <> · local time {localTime}</> : null}
          </>
        }
        actions={
          <>
            {can(user.role, 'viewOutreach') ? (
              <ButtonLink href={`/outreach/${link.id}`} size="sm" icon="phone">Open in outreach</ButtonLink>
            ) : null}
            {can(user.role, 'reviewContacts') ? (
              <ButtonLink href={`/review?focus=${link.id}`} variant="outline" size="sm" icon="review">Review</ButtonLink>
            ) : null}
          </>
        }
      />

      {/* ======================================================== identity bar */}
      <Card className="mb-4" elevation="raised">
        <CardBody className="flex flex-wrap items-center gap-6">
          <ScoreRing value={link.totalScore} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={link.priority} pending={isP1 && link.humanReviewStatus !== 'APPROVED'} />
              <Badge tone="neutral" icon="user">{ROLE_CATEGORY_LABELS[contact.roleCategory as RoleCategory]}</Badge>
              <Badge tone="outline">{humanize(contact.seniority)}</Badge>
              <Badge tone={link.relevanceGatePassed ? 'success' : 'danger'} icon={link.relevanceGatePassed ? 'check' : 'ban'}>
                Relevance gate {link.relevanceGatePassed ? 'passed' : 'failed'}
              </Badge>
              <Badge tone={link.complianceGatePassed ? 'success' : 'warning'} icon="compliance">
                Compliance {link.complianceGatePassed ? 'cleared' : 'incomplete'}
              </Badge>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <MiniStat label="Company fit" value={<>{link.fitScore}<span className="text-xs font-normal text-navy-400">/25</span></>} />
              <MiniStat label="Role relevance" value={<>{link.roleRelevanceScore}<span className="text-xs font-normal text-navy-400">/25</span></>} />
              <MiniStat label="Trigger" value={<>{link.triggerScore}<span className="text-xs font-normal text-navy-400">/20</span></>} />
              <MiniStat label="Engagement" value={<>{link.engagementScore}<span className="text-xs font-normal text-navy-400">/15</span></>} />
              <MiniStat label="Data quality" value={<>{link.dataQualityScore}<span className="text-xs font-normal text-navy-400">/10</span></>} />
              <MiniStat label="Attendance" value={<>{link.attendanceLikelihoodScore}<span className="text-xs font-normal text-navy-400">/5</span></>} />
            </dl>
          </div>
        </CardBody>
      </Card>

      {link.gateFailureReasons.length > 0 ? (
        <Alert tone="danger" title="This contact failed the relevance or compliance gate" className="mb-4">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {link.gateFailureReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </Alert>
      ) : null}

      {isP1 && link.humanReviewStatus !== 'APPROVED' ? (
        <Alert tone="warning" title="P1 pending approval" className="mb-4">
          The engine scored this contact P1. It cannot be worked or exported as an approved P1 until a written
          &ldquo;why this contact&rdquo; justification exists and a manager approves it.
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* =============================================== main column */}
        <div className="space-y-4 xl:col-span-2">
          <Card accent={link.whyThisContact ? 'success' : 'warn'}>
            <CardHeader
              title="Why this contact"
              description={link.whyThisContact
                ? 'Written by a person and required before P1 approval.'
                : 'No human justification written yet.'}
              icon={<Icon name="document" className="h-4 w-4" />}
            />
            <CardBody>
              {link.whyThisContact ? (
                <p className="text-md leading-relaxed text-navy-800">{link.whyThisContact}</p>
              ) : (
                <p className="text-base text-navy-500">Not yet written. A P1 requires one before approval.</p>
              )}

              {link.whyThisContactDraft ? (
                <div className="mt-4 rounded-lg border border-line bg-surface-sunk px-4 py-3">
                  <p className="eyebrow mb-1.5">Engine draft</p>
                  <p className="text-sm leading-relaxed text-navy-600">{link.whyThisContactDraft}</p>
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-navy-400">
                    <Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0" />
                    A generated draft never satisfies the P1 justification rule on its own.
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Score breakdown"
              description="Every point, the evidence behind it, and the record fields it came from."
              icon={<Icon name="scoring" className="h-4 w-4" />}
            />
            <CardBody>
              {breakdown
                ? <ScoreBreakdown breakdown={breakdown} />
                : <p className="text-base text-navy-500">This contact has not been scored yet.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Relevance and compliance gates"
              description="The gates run before any priority is assigned. A high score never rescues a failed gate."
              icon={<Icon name="shield" className="h-4 w-4" />}
            />
            <CardBody className="space-y-4">
              <GateChecks checks={breakdown?.gateChecks ?? []} />

              {breakdown ? (
                <div className="rounded-lg border border-line bg-surface-sunk px-4 py-3">
                  <p className="eyebrow mb-1.5">Compliance</p>
                  <p className="text-sm font-medium text-navy-800">{breakdown.compliance.summary}</p>
                  {breakdown.compliance.blockedChannels.length > 0 ? (
                    <ul className="mt-2.5 space-y-1.5">
                      {breakdown.compliance.blockedChannels.map((entry) => (
                        <li key={entry.channel} className="flex items-start gap-2 text-xs text-navy-600">
                          <Icon name="ban" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-500" />
                          <span><span className="font-medium">{humanize(entry.channel)} blocked:</span> {entry.reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Engagement timeline"
              description={`${timeline.length} recorded signals on this campaign.`}
              icon={<Icon name="trendUp" className="h-4 w-4" />}
            />
            <CardBody className="p-0">
              {timeline.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-navy-500">No engagement recorded yet.</p>
              ) : (
                <ol className="relative px-5 py-4">
                  <span aria-hidden="true" className="absolute bottom-6 left-[26px] top-6 w-px bg-line" />
                  {timeline.map((entry) => (
                    <li key={entry.id} className="relative flex items-start gap-4 py-2.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative z-10 mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full ring-4 ring-surface',
                          entry.negative ? 'bg-danger-500' : entry.pointsAwarded > 0 ? 'bg-success-500' : 'bg-brand-400',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy-800">{entry.label}</p>
                        <p className="text-xs text-navy-500">{formatDateTime(entry.occurredAt)}</p>
                      </div>
                      {entry.pointsAwarded > 0 ? (
                        <span className="tabular shrink-0 rounded-md bg-success-50 px-1.5 py-0.5 text-xs font-semibold text-success-700">
                          +{entry.pointsAwarded}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Outreach history"
              description={`${activityCount} calls, emails and WhatsApp messages logged against this campaign.`}
              icon={<Icon name="outreach" className="h-4 w-4" />}
            />
            <CardBody className="p-0">
              <TableWrap>
                <Table>
                  <thead>
                    <tr><Th>When</Th><Th>Channel</Th><Th>Detail</Th><Th>Outcome</Th></tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => (
                      <Tr key={call.id}>
                        <Td className="whitespace-nowrap text-xs">{formatDateTime(call.callDate)}</Td>
                        <Td><Badge tone="neutral" icon="phone">Call</Badge></Td>
                        <Td className="max-w-md text-xs">
                          {call.notes ?? '—'}
                          {call.nextAction ? <p className="mt-1 text-navy-500">Next: {call.nextAction}</p> : null}
                        </Td>
                        <Td><Badge tone="outline">{humanize(call.outcome)}</Badge></Td>
                      </Tr>
                    ))}
                    {emails.map((email) => (
                      <Tr key={email.id}>
                        <Td className="whitespace-nowrap text-xs">{formatDateTime(email.sentAt ?? email.createdAt)}</Td>
                        <Td><Badge tone="neutral" icon="mail">Email</Badge></Td>
                        <Td className="max-w-md"><p className="text-xs font-medium text-navy-800">{email.subject}</p></Td>
                        <Td><Badge tone="outline">{humanize(email.deliveryStatus)}</Badge></Td>
                      </Tr>
                    ))}
                    {whatsapps.map((message) => (
                      <Tr key={message.id}>
                        <Td className="whitespace-nowrap text-xs">{formatDateTime(message.sentAt ?? message.createdAt)}</Td>
                        <Td><Badge tone="neutral" icon="chat">WhatsApp</Badge></Td>
                        <Td className="max-w-md text-xs">{message.messageText.slice(0, 140)}</Td>
                        <Td><Badge tone="outline">{humanize(message.deliveryStatus)}</Badge></Td>
                      </Tr>
                    ))}
                    {activityCount === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-10 text-center text-sm text-navy-500">
                          Nothing logged yet.
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
              title="Score history"
              description="Append-only. Score changes are never overwritten."
              icon={<Icon name="clock" className="h-4 w-4" />}
            />
            <CardBody className="p-0">
              <TableWrap>
                <Table>
                  <thead>
                    <tr><Th>When</Th><Th>Change</Th><Th>Reason</Th><Th>Detail</Th></tr>
                  </thead>
                  <tbody>
                    {audits.slice(0, 25).map((audit) => {
                      const delta = audit.previousTotal === null ? null : audit.newTotal - audit.previousTotal;
                      return (
                        <Tr key={audit.id}>
                          <Td className="whitespace-nowrap text-xs">{formatDateTime(audit.createdAt)}</Td>
                          <Td className="whitespace-nowrap">
                            <span className="tabular flex items-center gap-1.5 text-sm">
                              <span className="text-navy-400">{audit.previousTotal ?? '—'}</span>
                              <Icon name="chevronRight" className="h-3 w-3 text-navy-300" />
                              <span className="font-semibold text-navy-900">{audit.newTotal}</span>
                              {delta !== null && delta !== 0 ? (
                                <span className={cn(
                                  'rounded px-1 text-[10px] font-semibold',
                                  delta > 0 ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700',
                                )}>
                                  {delta > 0 ? `+${delta}` : delta}
                                </span>
                              ) : null}
                            </span>
                            <p className="mt-0.5 text-xs text-navy-500">
                              {audit.previousPriority ?? 'unscored'} → {audit.newPriority}
                            </p>
                          </Td>
                          <Td className="text-xs">{humanize(audit.reason)}</Td>
                          <Td className="max-w-md text-xs text-navy-600">{audit.detail ?? '—'}</Td>
                        </Tr>
                      );
                    })}
                    {audits.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-10 text-center text-sm text-navy-500">
                          No score history yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </Table>
              </TableWrap>
            </CardBody>
          </Card>
        </div>

        {/* ================================================ side column */}
        <div className="space-y-4">
          <Card accent="brand">
            <CardHeader
              title="Recommended actions"
              description="Different by priority band, not a single template."
              icon={<Icon name="target" className="h-4 w-4" />}
            />
            <CardBody className="space-y-4 text-base">
              <div>
                <p className="eyebrow mb-1">Channel</p>
                <p className="font-medium text-navy-800">
                  {link.recommendedChannel ? humanize(link.recommendedChannel) : 'No permitted channel'}
                </p>
              </div>
              {([
                ['Next action', link.recommendedNextAction],
                ['Call opening', link.callerOpening],
                ['Email angle', link.emailAngle],
                ['WhatsApp', link.whatsappRecommendation],
              ] as const).map(([label, value]) => (
                <div key={label}>
                  <p className="eyebrow mb-1">{label}</p>
                  <p className="text-sm leading-relaxed text-navy-700">{value ?? '—'}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {breakdown?.accountSignal?.message ? (
            <Card accent="success">
              <CardHeader
                title="Account signal"
                description="Shown separately, never folded into the contact score."
                icon={<Icon name="spark" className="h-4 w-4" />}
              />
              <CardBody>
                <Badge tone="success" icon="spark">{breakdown.accountSignal.message}</Badge>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <MiniStat label="In campaign" value={breakdown.accountSignal.contactsInCampaign} />
                  <MiniStat label="Registered" value={breakdown.accountSignal.registered} />
                  <MiniStat label="Attended" value={breakdown.accountSignal.attended} />
                  <MiniStat label="Meetings" value={breakdown.accountSignal.meetingsRequested} />
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-navy-500">
                  Account multiplier {breakdown.accountSignal.multiplier.toFixed(2)}&times; is a display signal only.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Role classification" icon={<Icon name="user" className="h-4 w-4" />} />
            <CardBody className="space-y-3">
              <div>
                <p className="text-md font-semibold text-navy-800">
                  {ROLE_CATEGORY_LABELS[contact.roleCategory as RoleCategory]}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-navy-500">
                  {ROLE_CATEGORY_DESCRIPTIONS[contact.roleCategory as RoleCategory]}
                </p>
              </div>

              <div className="rounded-lg bg-surface-sunk px-3 py-2.5">
                <p className="eyebrow mb-1">Engine read the title as</p>
                <p className="break-words font-mono text-xs text-navy-700">
                  {contact.normalizedJobTitle || '(nothing usable)'}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                {([
                  ['Seniority', humanize(contact.seniority)],
                  ['Decision role', humanize(contact.decisionRole)],
                  ['Owns budget', contact.ownsBudget ? 'Yes' : 'No'],
                  ['Influences decision', contact.influencesDecision ? 'Yes' : 'No'],
                  ['Direct responsibility', contact.directProblemResponsibility ? 'Confirmed' : 'Not confirmed'],
                  ['Role confidence', humanize(contact.roleConfidence)],
                  ['Department', contact.department ?? '—'],
                  ['Tenure', contact.tenureMonths ? `${contact.tenureMonths} months` : '—'],
                ] as const).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-navy-500">{label}</dt>
                    <dd className="font-medium text-navy-800">{value}</dd>
                  </div>
                ))}
              </dl>

              {contact.roleRelevanceNotes ? (
                <p className="border-t border-line pt-3 text-xs leading-relaxed text-navy-600">
                  {contact.roleRelevanceNotes}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Reachability and permission" icon={<Icon name="mail" className="h-4 w-4" />} />
            <CardBody className="space-y-3">
              <div className="space-y-2">
                <StatusDot tone={reachTone(contact.emailStatus)} label={`Email · ${humanize(contact.emailStatus)}`} />
                <p className="pl-3.5 break-all text-xs text-navy-700">{contact.workEmail ?? 'None on record'}</p>
                <StatusDot tone={reachTone(contact.phoneStatus)} label={`Phone · ${humanize(contact.phoneStatus)}`} />
                <p className="pl-3.5 text-xs text-navy-700">{contact.phoneNumber ?? 'None on record'}</p>
                <StatusDot tone={reachTone(contact.whatsappStatus)} label={`WhatsApp · ${humanize(contact.whatsappStatus)}`} />
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-line pt-3 text-xs">
                {([
                  ['Consent', humanize(contact.consentStatus)],
                  ['Source', contact.contactSource ?? 'Not recorded'],
                  ['Last verified', formatDate(contact.lastVerifiedAt)],
                  ['Time zone', contact.timeZone ?? '—'],
                ] as const).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-navy-500">{label}</dt>
                    <dd className="font-medium text-navy-800">{value}</dd>
                  </div>
                ))}
              </dl>

              {can(user.role, 'viewCompliance') ? (
                <ButtonLink
                  href={`/compliance?contactId=${contact.id}`}
                  variant="outline"
                  size="sm"
                  block
                  icon="compliance"
                >
                  Open compliance record
                </ButtonLink>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Account" icon={<Icon name="building" className="h-4 w-4" />} />
            <CardBody className="space-y-3">
              <div>
                <p className="text-md font-semibold text-navy-800">{account.companyName}</p>
                <p className="text-xs text-navy-500">
                  {account.industry}{account.subIndustry ? ` · ${account.subIndustry}` : ''}
                </p>
                <p className="text-xs text-navy-500">
                  {humanize(account.employeeBand)} employees · {humanize(account.revenueBand)}
                </p>
              </div>

              {account.recentBusinessTrigger ? (
                <div className="rounded-lg border border-warn-200 bg-warn-50 px-3 py-2.5">
                  <p className="eyebrow mb-1 text-warn-800">Business trigger</p>
                  <p className="text-xs leading-relaxed text-warn-900">{account.recentBusinessTrigger}</p>
                  <p className="mt-1.5 text-[11px] text-warn-800">
                    Verification: {humanize(account.triggerVerification)}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-surface-sunk px-3 py-2.5 text-xs text-navy-500">
                  No business trigger recorded.
                </p>
              )}

              <div>
                <p className="eyebrow mb-1.5">Trigger contribution</p>
                <Progress
                  value={link.triggerScore}
                  max={20}
                  showValue
                  tone={link.triggerScore >= 12 ? 'success' : link.triggerScore > 0 ? 'warning' : 'neutral'}
                  label={`Trigger score ${link.triggerScore} of 20`}
                />
              </div>

              <ButtonLink href={`/accounts/${account.id}`} variant="outline" size="sm" block icon="accounts">
                Open account
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
