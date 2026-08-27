import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RoleCategory } from '@prisma/client';
import { getCurrentUser, requireCapability, can } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { compareMethods, getAccountSignals, getCampaignKpis } from '@/lib/services/analytics-service';
import { resolveWeights } from '@/lib/domain/scoring/weights';
import { WeightsEditor } from '@/components/weights-editor';
import { CampaignCostForm, RelevanceConfigForm, RescoreButton } from '@/components/campaign-forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KpiCard } from '@/components/kpi-card';
import { ROLE_CATEGORY_LABELS } from '@/lib/domain/role-taxonomy';
import { formatCurrency, formatDate, humanize, percent } from '@/lib/utils';

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability('campaign:view');
  const user = await getCurrentUser();
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const [kpis, comparison, accountSignals] = await Promise.all([
    getCampaignKpis(campaign.id),
    compareMethods(campaign.id),
    getAccountSignals(campaign.id),
  ]);

  const canConfigure = user ? can(user.role, 'scoring:configure') : false;
  const canManage = user ? can(user.role, 'campaign:manage') : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-navy-900">{campaign.name}</h1>
            <Badge variant={campaign.status === 'ACTIVE' ? 'success' : 'muted'}>
              {humanize(campaign.status)}
            </Badge>
            <Badge variant="muted">{humanize(campaign.campaignType)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {campaign.clientBrand} &middot; {campaign.targetBusinessProblem}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/contacts?campaign=${campaign.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View contacts
          </Link>
          <Link href={`/dashboard?campaign=${campaign.id}`} className="text-sm font-medium text-primary hover:underline">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Enrolled" value={kpis.totalContacts} />
        <KpiCard label="P1" value={kpis.p1} tone="good" />
        <KpiCard label="P2" value={kpis.p2} />
        <KpiCard label="P3" value={kpis.p3} tone="warn" />
        <KpiCard label="Reject" value={kpis.reject} tone="bad" />
        <KpiCard label="Hold" value={kpis.complianceHold} tone="warn" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="scoring">Scoring weights</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="accounts">Account signals</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------- Overview --- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Campaign brief</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{campaign.description}</p>
                <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Topic</dt>
                    <dd className="font-medium">{campaign.topic}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Event date</dt>
                    <dd className="font-medium">
                      {campaign.eventDate ? `${formatDate(campaign.eventDate)} ${campaign.eventTime ?? ''}` : 'On demand'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Event time zone</dt>
                    <dd className="font-medium">{campaign.eventTimeZone ?? '-'}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-muted-foreground">Speaker</dt>
                    <dd className="font-medium">{campaign.speakerInformation ?? '-'}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-muted-foreground">Links</dt>
                    <dd className="font-medium break-all">
                      {campaign.registrationUrl ?? campaign.whitePaperUrl ?? '-'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign cost</CardTitle>
                  <CardDescription>Drives cost per verified attendee.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="numeric text-2xl font-semibold text-navy-900">
                    {formatCurrency(kpis.campaignCost, kpis.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {kpis.verifiedAttendees} verified attendees &middot;{' '}
                    {formatCurrency(kpis.costPerVerifiedAttendee, kpis.currency)} each
                  </p>
                  {canManage ? (
                    <CampaignCostForm
                      campaignId={campaign.id}
                      cost={kpis.campaignCost ?? 0}
                      currency={kpis.currency}
                    />
                  ) : null}
                </CardContent>
              </Card>

              {canManage ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Re-score</CardTitle>
                    <CardDescription>Run the engine over every enrolled contact.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RescoreButton campaignId={campaign.id} />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------- Targeting -- */}
        <TabsContent value="targeting" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Targeting criteria</CardTitle>
                <CardDescription>Used by the relevance gate and component A of the score.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Industries', campaign.targetIndustries],
                  ['Sub-industries', campaign.targetSubIndustries],
                  ['Countries', campaign.targetCountries],
                  ['Cities', campaign.targetCities],
                  ['Employee bands', campaign.targetEmployeeBands.map(humanize)],
                  ['Revenue bands', campaign.targetRevenueBands.map(humanize)],
                  ['Technologies', campaign.targetTechnologies],
                  ['Job functions', campaign.targetJobFunctions],
                  ['Seniorities', campaign.targetSeniorities.map(humanize)],
                  ['Languages', campaign.preferredLanguages],
                ].map(([label, values]) => (
                  <div key={label as string}>
                    <p className="text-xs font-medium text-muted-foreground">{label as string}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {(values as string[]).length > 0 ? (
                        (values as string[]).map((value) => (
                          <Badge key={value} variant="muted">
                            {value}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No restriction</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Definition of a relevant role</CardTitle>
                <CardDescription>
                  Role categories marked relevant here, plus the phrases that count as genuine
                  ownership of this campaign&rsquo;s problem.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="warning">
                  A contact whose role category is not marked relevant can never reach P1, whatever
                  their total score. Single ambiguous words (for example &ldquo;customer&rdquo;) are
                  only ever treated as weak evidence and must be corroborated by department, job
                  function, or a recorded responsibility.
                </Alert>
                {canManage ? (
                  <RelevanceConfigForm
                    campaignId={campaign.id}
                    selected={campaign.relevantRoleCategories}
                    terms={campaign.problemOwnershipTerms}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {campaign.relevantRoleCategories.map((role) => (
                      <Badge key={role} variant="info">
                        {ROLE_CATEGORY_LABELS[role as RoleCategory]}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------ Scoring -- */}
        <TabsContent value="scoring">
          <Card>
            <CardHeader>
              <CardTitle>Scoring weights</CardTitle>
              <CardDescription>
                The default model allocates 25 / 25 / 20 / 15 / 10 / 5 across the six components.
                Any configuration must total exactly 100.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canConfigure ? (
                <WeightsEditor campaignId={campaign.id} initial={resolveWeights(campaign.scoringWeights) as never} />
              ) : (
                <Alert variant="warning">Only an administrator can change scoring weights.</Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------------------------- Comparison -- */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Surface-level list versus SIGNAL-scored list</CardTitle>
              <CardDescription>
                Both columns are drawn from the same imported data and carry the same campaign cost.
                The surface-level list is what industry + geography + a title keyword would have
                produced.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {comparison.comparison.map((row) => (
                      <TableHead key={row.method} className="text-right">
                        {row.method}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {([
                    ['List size', (r: (typeof comparison.comparison)[number]) => r.listSize],
                    ['Contacted', (r: (typeof comparison.comparison)[number]) => r.contacted],
                    ['Registered', (r: (typeof comparison.comparison)[number]) => r.registered],
                    ['Attended', (r: (typeof comparison.comparison)[number]) => r.attended],
                    ['Positive replies', (r: (typeof comparison.comparison)[number]) => r.positiveReplies],
                    ['Meetings', (r: (typeof comparison.comparison)[number]) => r.meetings],
                    ['Registration rate', (r: (typeof comparison.comparison)[number]) => percent(r.registrationRate)],
                    ['Attendance rate', (r: (typeof comparison.comparison)[number]) => percent(r.attendanceRate)],
                    ['Positive response rate', (r: (typeof comparison.comparison)[number]) => percent(r.positiveResponseRate)],
                    ['Meeting rate', (r: (typeof comparison.comparison)[number]) => percent(r.meetingRate)],
                    [
                      'Cost per verified attendee',
                      (r: (typeof comparison.comparison)[number]) =>
                        formatCurrency(r.costPerVerifiedAttendee, comparison.currency),
                    ],
                  ] as const).map(([label, accessor]) => (
                    <TableRow key={label}>
                      <TableCell className="font-medium">{label}</TableCell>
                      {comparison.comparison.map((row) => (
                        <TableCell key={row.method} className="numeric text-right">
                          {accessor(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------- Accounts -- */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Account-level engagement</CardTitle>
              <CardDescription>
                Displayed separately from individual contact scores. The multiplier is an account
                signal, not a contact score adjustment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Contacts</TableHead>
                    <TableHead className="text-right">Registered</TableHead>
                    <TableHead className="text-right">Attended</TableHead>
                    <TableHead className="text-right">Engaged</TableHead>
                    <TableHead className="text-right">Meetings</TableHead>
                    <TableHead className="text-right">Signal</TableHead>
                    <TableHead>Interpretation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountSignals.slice(0, 25).map((signal) => (
                    <TableRow key={signal.accountId}>
                      <TableCell className="font-medium">{signal.companyName}</TableCell>
                      <TableCell className="numeric text-right">{signal.contactsInCampaign}</TableCell>
                      <TableCell className="numeric text-right">{signal.registered}</TableCell>
                      <TableCell className="numeric text-right">{signal.attended}</TableCell>
                      <TableCell className="numeric text-right">{signal.engaged}</TableCell>
                      <TableCell className="numeric text-right">{signal.meetingsRequested}</TableCell>
                      <TableCell className="numeric text-right">x{signal.multiplier.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {signal.note ?? signal.label}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
