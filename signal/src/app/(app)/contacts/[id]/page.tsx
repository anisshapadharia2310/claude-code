import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { previewScore } from '@/lib/services/scoring-service';
import { humanizeEvent } from '@/lib/domain/engagement';
import { ROLE_CATEGORY_LABELS, DECISION_ROLE_LABELS } from '@/lib/domain/role-taxonomy';
import { LEGAL_DISCLAIMER } from '@/lib/domain/compliance-gate';
import { PriorityBadge } from '@/components/priority-badge';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { ComplianceGatePanel, RelevanceGatePanel } from '@/components/gate-checklist';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { ScoreLine } from '@/lib/domain/types';
import { daysSince, formatDate, formatDateTime, humanize, localTime } from '@/lib/utils';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability('contact:view');
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      account: true,
      complianceRecords: { orderBy: { updatedAt: 'desc' } },
      duplicateOf: { select: { id: true, firstName: true, lastName: true } },
      campaignContacts: {
        include: {
          campaign: { select: { id: true, name: true, topic: true, campaignType: true } },
          assignedTo: { select: { name: true } },
          scoreAudits: {
            orderBy: { createdAt: 'desc' },
            take: 12,
            include: { changedBy: { select: { name: true } } },
          },
        },
      },
      engagementEvents: {
        orderBy: { eventDate: 'desc' },
        include: { campaign: { select: { name: true } } },
      },
    },
  });
  if (!contact) notFound();

  // Recompute live so the explanation always matches the current data.
  const scored = await Promise.all(
    contact.campaignContacts.map(async (enrolment) => ({
      enrolment,
      result: await previewScore(enrolment.id),
    })),
  );

  const staleDays = daysSince(contact.lastVerifiedAt);
  const compliance = contact.complianceRecords[0];

  return (
    <div className="space-y-5">
      {/* --- Header --------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-navy-900">
              {contact.firstName} {contact.lastName}
            </h1>
            <Badge variant="muted">{ROLE_CATEGORY_LABELS[contact.roleCategory]}</Badge>
            <Badge variant="muted">{humanize(contact.seniority)}</Badge>
            {contact.isDuplicate ? <Badge variant="danger">Duplicate</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {contact.jobTitle} &middot;{' '}
            <Link href={`/accounts?q=${encodeURIComponent(contact.account.companyName)}`} className="hover:underline">
              {contact.account.companyName}
            </Link>{' '}
            &middot; {contact.city ? `${contact.city}, ` : ''}
            {contact.country} &middot; {localTime(contact.timeZone)} local time
          </p>
        </div>
      </div>

      {contact.isDuplicate && contact.duplicateOf ? (
        <Alert variant="danger" title="Duplicate record">
          This record duplicates{' '}
          <Link href={`/contacts/${contact.duplicateOf.id}`} className="underline">
            {contact.duplicateOf.firstName} {contact.duplicateOf.lastName}
          </Link>
          . Duplicates are rejected by the relevance gate and must not be contacted.
        </Alert>
      ) : null}

      {staleDays !== null && staleDays > 180 ? (
        <Alert variant="warning" title="Stale record">
          This contact was last verified {staleDays} days ago, beyond the 180-day limit. The relevance
          gate treats it as out of date until a researcher re-verifies it.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* --- Contact facts ------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle>Contact and reachability</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {[
                ['Normalised title', contact.normalizedJobTitle],
                ['Department', contact.department ?? '-'],
                ['Job function', contact.jobFunction ?? '-'],
                ['Decision role', DECISION_ROLE_LABELS[contact.decisionRole]],
                ['Owns budget', contact.ownsBudget ? 'Yes' : 'No'],
                ['Influences decision', contact.influencesDecision ? 'Yes' : 'No'],
                ['Owns this problem', contact.directProblemResponsibility ? 'Yes' : 'No'],
                ['Role confidence', humanize(contact.roleConfidence)],
                ['Tenure', contact.tenureMonths ? `${contact.tenureMonths} months` : '-'],
                ['Work email', contact.workEmail ?? 'None'],
                ['Email status', humanize(contact.emailStatus)],
                ['Phone', contact.phoneNumber ?? 'None'],
                ['Phone status', humanize(contact.phoneStatus)],
                ['WhatsApp', humanize(contact.whatsappStatus)],
                ['Consent', humanize(contact.consentStatus)],
                ['Source', contact.contactSource ?? 'Not recorded'],
                ['Last verified', formatDate(contact.lastVerifiedAt)],
                ['Language', contact.language ?? '-'],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-muted-foreground">{label as string}</dt>
                  <dd className="font-medium text-navy-900">{value as string}</dd>
                </div>
              ))}
            </dl>
            {contact.roleRelevanceNotes ? (
              <p className="mt-3 rounded border border-navy-200 bg-navy-50 p-2 text-xs">
                <span className="font-medium">Role notes: </span>
                {contact.roleRelevanceNotes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* --- Account facts ------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>{contact.account.industry}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {[
                ['Domain', contact.account.domain ?? '-'],
                ['Sub-industry', contact.account.subIndustry ?? '-'],
                ['Employees', humanize(contact.account.employeeBand).replace('Band ', '')],
                ['Revenue', humanize(contact.account.revenueBand)],
                ['Locations', contact.account.numberOfLocations ?? '-'],
                ['Named account', contact.account.namedAccountStatus ? 'Yes' : 'No'],
                ['Relationship', humanize(contact.account.existingClientRelationship)],
                ['Data confidence', humanize(contact.account.accountDataConfidence)],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-muted-foreground">{label as string}</dt>
                  <dd className="font-medium text-navy-900">{value as string}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Technology</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {contact.account.existingTechnology.map((tech) => (
                  <Badge key={tech} variant="info">
                    {tech}
                  </Badge>
                ))}
                {contact.account.competitorTechnology.map((tech) => (
                  <Badge key={tech} variant="warning">
                    {tech} (competitor)
                  </Badge>
                ))}
                {contact.account.existingTechnology.length + contact.account.competitorTechnology.length === 0 ? (
                  <span className="text-xs text-muted-foreground">None recorded</span>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Triggers ------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle>Business triggers</CardTitle>
            <CardDescription>
              Verification state: {humanize(contact.account.triggerVerification)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.account.recentBusinessTrigger ? (
              <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                {contact.account.recentBusinessTrigger}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No narrative trigger recorded.</p>
            )}
            <ul className="space-y-1 text-xs">
              {[
                ['Open relevant roles', contact.account.relevantOpenJobPostings > 0, `${contact.account.relevantOpenJobPostings} roles`],
                ['Transformation project', contact.account.transformationActivity, ''],
                ['Expansion', contact.account.expansionActivity, ''],
                ['Merger or acquisition', contact.account.mergerOrAcquisitionActivity, ''],
                ['Leadership change', contact.account.leadershipChange, ''],
                ['Regulatory pressure', contact.account.regulatoryPressure, ''],
                ['Publicly stated priority', contact.account.publiclyStatedPriority, ''],
              ].map(([label, active, detail]) => (
                <li key={label as string} className="flex items-center justify-between">
                  <span className={active ? 'text-navy-900' : 'text-muted-foreground'}>{label as string}</span>
                  <Badge variant={active ? 'success' : 'muted'}>
                    {active ? (detail as string) || 'Yes' : 'No'}
                  </Badge>
                </li>
              ))}
            </ul>
            {contact.account.triggerSource ? (
              <p className="text-[11px] text-muted-foreground">
                Source: {contact.account.triggerSource} ({formatDate(contact.account.triggerDate)})
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* --- Per-campaign scoring ------------------------------------------- */}
      <Tabs defaultValue={scored[0]?.enrolment.id ?? 'none'}>
        <TabsList className="flex-wrap">
          {scored.map(({ enrolment }) => (
            <TabsTrigger key={enrolment.id} value={enrolment.id}>
              {enrolment.campaign.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="timeline">Engagement timeline</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {scored.map(({ enrolment, result }) => (
          <TabsContent key={enrolment.id} value={enrolment.id} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-navy-200 bg-card p-3">
              <PriorityBadge priority={result.priority} />
              <span className="numeric text-2xl font-semibold text-navy-900">{result.totalScore}</span>
              <span className="text-xs text-muted-foreground">
                base {result.baseTotal}
                {result.engagementBonus > 0 ? ` + ${result.engagementBonus} engagement` : ''} &middot;
                capped at 100
              </span>
              <div className="ml-auto flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/outreach/${enrolment.id}`}>Open outreach workspace</Link>
                </Button>
              </div>
            </div>

            <ul className="space-y-1">
              {result.priorityReasons.map((reason) => (
                <li key={reason} className="rounded border border-navy-200 bg-navy-50 px-3 py-2 text-xs text-navy-900">
                  {reason}
                </li>
              ))}
            </ul>

            {result.priority === 'P1' ? (
              <Alert variant="success" title="Why this contact">
                {enrolment.whyThisContact}
              </Alert>
            ) : enrolment.whyThisContact ? (
              <Alert title="Why this contact">{enrolment.whyThisContact}</Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Score breakdown</CardTitle>
                  <CardDescription>
                    Every criterion the engine evaluated, including those that scored nothing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoreBreakdown
                    lines={result.explanation as ScoreLine[]}
                    engagementBonus={result.engagementBonus}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Gates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RelevanceGatePanel result={result.relevance} />
                    <ComplianceGatePanel result={result.compliance} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommended play</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div>
                      <p className="font-medium text-muted-foreground">Channel</p>
                      <p>{result.playbook.recommendedChannel ?? 'No permitted channel'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Next action</p>
                      <p>{result.playbook.recommendedNextAction}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Caller opening</p>
                      <p className="italic">{result.playbook.callerOpening}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Email angle</p>
                      <p>{result.playbook.emailAngle}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">WhatsApp</p>
                      <p>{result.playbook.whatsappRecommended ? 'Recommended' : 'Not recommended'} - {result.playbook.whatsappReason}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* --- Audit history -------------------------------------------- */}
            <Card>
              <CardHeader>
                <CardTitle>Score history</CardTitle>
                <CardDescription>Every score change is recorded and attributable.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrolment.scoreAudits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell className="text-xs">{formatDateTime(audit.createdAt)}</TableCell>
                        <TableCell className="text-xs">{humanize(audit.source)}</TableCell>
                        <TableCell className="text-xs">{audit.reason}</TableCell>
                        <TableCell className="numeric text-right text-xs">
                          {audit.previousTotal ?? '-'} &rarr; {audit.newTotal}
                        </TableCell>
                        <TableCell className="text-xs">
                          {audit.previousPriority ? humanize(audit.previousPriority) : '-'} &rarr;{' '}
                          {humanize(audit.newPriority)}
                        </TableCell>
                        <TableCell className="text-xs">{audit.changedBy?.name ?? 'System'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* --- Timeline ------------------------------------------------------ */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Engagement timeline</CardTitle>
              <CardDescription>{contact.engagementEvents.length} recorded events.</CardDescription>
            </CardHeader>
            <CardContent>
              {contact.engagementEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No engagement recorded yet.</p>
              ) : (
                <ol className="relative space-y-3 border-l border-navy-200 pl-4">
                  {contact.engagementEvents.map((event) => (
                    <li key={event.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-navy-400"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-navy-900">
                          {humanizeEvent(event.eventType)}
                        </span>
                        {event.pointsAwarded > 0 ? (
                          <Badge variant="success">+{event.pointsAwarded}</Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(event.eventDate)} &middot; {event.campaign.name}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Compliance ---------------------------------------------------- */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance record</CardTitle>
              <CardDescription>{LEGAL_DISCLAIMER}</CardDescription>
            </CardHeader>
            <CardContent>
              {compliance ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:grid-cols-3">
                  {[
                    ['Country', compliance.country],
                    ['Consent status', humanize(compliance.consentStatus)],
                    ['Consent source', compliance.consentSource ?? 'Not recorded'],
                    ['Consent date', formatDate(compliance.consentDate)],
                    ['Lawful basis', humanize(compliance.lawfulBasis)],
                    ['Notice provided', compliance.noticeProvided ? 'Yes' : 'No'],
                    ['Opt-out status', humanize(compliance.optOutStatus)],
                    ['Allowed channels', compliance.allowedChannels.join(', ') || 'None'],
                    ['Blocked channels', compliance.blockedChannels.join(', ') || 'None'],
                    ['Reviewed', formatDate(compliance.reviewedAt)],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-muted-foreground">{label as string}</dt>
                      <dd className="font-medium text-navy-900">{value as string}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <Alert variant="warning">
                  No compliance record exists for this contact. Outreach is on compliance hold.
                </Alert>
              )}
              {compliance?.complianceNotes ? (
                <p className="mt-3 text-xs text-muted-foreground">{compliance.complianceNotes}</p>
              ) : null}
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={`/compliance?contact=${contact.id}`}>Edit compliance record</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
