import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Channel } from '@prisma/client';
import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { previewScore } from '@/lib/services/scoring-service';
import { canUseChannel } from '@/lib/domain/compliance-gate';
import { humanizeEvent } from '@/lib/domain/engagement';
import { complianceFooter, getEmailProvider } from '@/lib/providers/email';
import { CallPanel, EmailPanel, FollowUpForm, WhatsAppPanel } from '@/components/outreach-panels';
import { PriorityBadge } from '@/components/priority-badge';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { ScoreLine } from '@/lib/domain/types';
import { formatDate, formatDateTime, humanize, isCallableNow, localTime } from '@/lib/utils';

export default async function OutreachWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability('outreach:perform');
  const { id } = await params;

  const record = await prisma.campaignContact.findUnique({
    where: { id },
    include: {
      contact: { include: { account: true, engagementEvents: { orderBy: { eventDate: 'desc' }, take: 25 } } },
      campaign: true,
      assignedTo: { select: { name: true } },
      callActivities: { orderBy: { callDate: 'desc' }, include: { caller: { select: { name: true } } } },
      emailActivities: { orderBy: { createdAt: 'desc' } },
      whatsappActivities: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!record) notFound();

  const result = await previewScore(record.id);
  const phone = canUseChannel(result.compliance, Channel.PHONE);
  const email = canUseChannel(result.compliance, Channel.EMAIL);
  const whatsapp = canUseChannel(result.compliance, Channel.WHATSAPP);
  const provider = getEmailProvider();

  const eventLocal = record.campaign.eventDate
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: record.contact.timeZone ?? 'UTC',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(record.campaign.eventDate)
    : null;

  const blocked = result.priority === 'REJECT' || result.priority === 'COMPLIANCE_HOLD';

  return (
    <div className="space-y-4">
      {/* --- Header --------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-navy-900">
              {record.contact.firstName} {record.contact.lastName}
            </h1>
            <PriorityBadge priority={result.priority} />
            <span className="numeric text-lg font-semibold text-navy-800">{result.totalScore}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {record.contact.jobTitle} &middot; {record.contact.account.companyName} &middot;{' '}
            {record.campaign.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isCallableNow(record.contact.timeZone) ? 'success' : 'warning'}>
            Local time {localTime(record.contact.timeZone)}
          </Badge>
          <Button asChild size="sm" variant="outline">
            <Link href={`/contacts/${record.contactId}`}>Full contact record</Link>
          </Button>
        </div>
      </div>

      {blocked ? (
        <Alert variant="danger" title="Outreach is blocked for this contact">
          {result.priorityReasons.join(' ')}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* --- Left: context ------------------------------------------------ */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Why this contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {record.whyThisContact ? (
                <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                  {record.whyThisContact}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No written justification yet. A contact cannot be promoted to P1 without one.
                </p>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">Role</p>
                <p className="text-xs">
                  {humanize(record.contact.roleCategory)} &middot; {humanize(record.contact.seniority)}{' '}
                  &middot; {humanize(record.contact.decisionRole)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Business trigger</p>
                <p className="text-xs">
                  {record.contact.account.recentBusinessTrigger ?? 'No verified trigger on record.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Recommended next action</p>
                <p className="text-xs">{record.recommendedNextAction}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Assigned to</p>
                <p className="text-xs">{record.assignedTo?.name ?? 'Unassigned'}</p>
              </div>
              <FollowUpForm
                campaignContactId={record.id}
                current={record.nextFollowUpAt?.toISOString().slice(0, 10) ?? null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score breakdown</CardTitle>
              <CardDescription>Hover any line for the reason.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreBreakdown
                lines={result.explanation as ScoreLine[]}
                engagementBonus={result.engagementBonus}
                compact
              />
            </CardContent>
          </Card>
        </div>

        {/* --- Middle: channels --------------------------------------------- */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Work this contact</CardTitle>
              <CardDescription>
                Channels are enabled only where the compliance gate permits them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={phone.allowed && !blocked ? 'call' : 'email'}>
                <TabsList>
                  <TabsTrigger value="call" disabled={blocked}>
                    Call {phone.allowed ? '' : '(blocked)'}
                  </TabsTrigger>
                  <TabsTrigger value="email" disabled={blocked}>
                    Email {email.allowed ? '' : '(blocked)'}
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" disabled={blocked}>
                    WhatsApp {whatsapp.allowed ? '' : '(blocked)'}
                  </TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="call">
                  <CallPanel
                    campaignContactId={record.id}
                    phoneAllowed={phone.allowed && !blocked}
                    phoneReason={phone.reason}
                    suggestedOpening={record.callerOpening ?? result.playbook.callerOpening}
                  />
                </TabsContent>

                <TabsContent value="email">
                  <EmailPanel
                    campaignContactId={record.id}
                    emailAllowed={email.allowed && !blocked}
                    emailReason={email.reason}
                    contact={{
                      firstName: record.contact.firstName,
                      lastName: record.contact.lastName,
                      company: record.contact.account.companyName,
                      workEmail: record.contact.workEmail,
                      jobTitle: record.contact.jobTitle,
                    }}
                    campaign={{
                      topic: record.campaign.topic,
                      targetBusinessProblem: record.campaign.targetBusinessProblem,
                      registrationUrl: record.campaign.registrationUrl,
                      whitePaperUrl: record.campaign.whitePaperUrl,
                    }}
                    emailAngle={record.emailAngle ?? result.playbook.emailAngle}
                    complianceFooter={complianceFooter()}
                    providerTransmits={provider.transmits}
                  />
                </TabsContent>

                <TabsContent value="whatsapp">
                  <WhatsAppPanel
                    campaignContactId={record.id}
                    allowed={whatsapp.allowed && !blocked}
                    reason={whatsapp.reason}
                    recommended={record.whatsappRecommended && !blocked}
                    contact={{
                      firstName: record.contact.firstName,
                      whatsappStatus: record.contact.whatsappStatus,
                      phoneNumber: record.contact.phoneNumber,
                    }}
                    campaign={{
                      name: record.campaign.name,
                      topic: record.campaign.topic,
                      eventLocal,
                      registrationUrl: record.campaign.registrationUrl,
                    }}
                  />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-navy-900">Previous call outcomes</h3>
                    {record.callActivities.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No calls logged.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {record.callActivities.map((call) => (
                          <li key={call.id} className="rounded border border-navy-200 p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <Badge variant="info">{humanize(call.outcome)}</Badge>
                              <span className="text-muted-foreground">
                                {formatDateTime(call.callDate)} &middot; {call.caller?.name ?? 'Unknown'}
                              </span>
                            </div>
                            {call.notes ? <p className="mt-1">{call.notes}</p> : null}
                            {call.nextAction ? (
                              <p className="mt-1 text-muted-foreground">Next: {call.nextAction}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-navy-900">Emails</h3>
                    {record.emailActivities.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No emails logged.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {record.emailActivities.map((mail) => (
                          <li key={mail.id} className="rounded border border-navy-200 p-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{mail.subject}</span>
                              <Badge variant={mail.deliveryStatus === 'BOUNCED' ? 'danger' : 'muted'}>
                                {humanize(mail.deliveryStatus)}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-muted-foreground">
                              {humanize(mail.emailType)} &middot; {formatDate(mail.sentAt)}
                              {mail.openedAt ? ` · opened ${formatDate(mail.openedAt)}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-navy-900">WhatsApp</h3>
                    {record.whatsappActivities.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No WhatsApp messages logged.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {record.whatsappActivities.map((message) => (
                          <li key={message.id} className="rounded border border-navy-200 p-2 text-xs">
                            <Badge variant="muted">{humanize(message.messageType)}</Badge>
                            <p className="mt-1">{message.messageText}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-navy-900">Engagement events</h3>
                    <ul className="space-y-1">
                      {record.contact.engagementEvents.map((event) => (
                        <li key={event.id} className="flex items-center justify-between text-xs">
                          <span>{humanizeEvent(event.eventType)}</span>
                          <span className="text-muted-foreground">{formatDate(event.eventDate)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
