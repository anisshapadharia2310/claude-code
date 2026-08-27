import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  compareMethods,
  getAccountSignals,
  getCampaignCharts,
  getCampaignKpis,
  getPortfolioSummary,
} from '@/lib/services/analytics-service';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AccountEngagementChart,
  EventsOverTimeChart,
  FunnelChart,
  MethodComparisonChart,
  PriorityBarChart,
  RegistrationByPriorityChart,
  ScoreDistributionChart,
} from '@/components/charts';
import { CampaignPicker } from '@/components/campaign-picker';
import { formatCurrency, percent } from '@/lib/utils';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; denied?: string }>;
}) {
  await requireCapability('dashboard:view');
  const params = await searchParams;

  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: 'asc' } });
  if (campaigns.length === 0) {
    return <Alert title="No campaigns yet">Run `npm run db:seed` or create a campaign to begin.</Alert>;
  }

  const campaign = campaigns.find((c) => c.id === params.campaign) ?? campaigns[0];
  const [kpis, charts, comparison, accountSignals, portfolio] = await Promise.all([
    getCampaignKpis(campaign.id),
    getCampaignCharts(campaign.id),
    compareMethods(campaign.id),
    getAccountSignals(campaign.id),
    getPortfolioSummary(),
  ]);

  const [oldMethod, signalMethod] = comparison.comparison;
  const comparisonChartData = [
    { metric: 'Registration', oldMethod: oldMethod.registrationRate, signal: signalMethod.registrationRate },
    { metric: 'Attendance', oldMethod: oldMethod.attendanceRate, signal: signalMethod.attendanceRate },
    { metric: 'Positive reply', oldMethod: oldMethod.positiveResponseRate, signal: signalMethod.positiveResponseRate },
    { metric: 'Meeting', oldMethod: oldMethod.meetingRate, signal: signalMethod.meetingRate },
  ];

  const topAccounts = accountSignals
    .filter((signal) => signal.engaged > 0)
    .slice(0, 8)
    .map((signal) => ({
      company: signal.companyName,
      engaged: signal.engaged,
      registered: signal.registered,
      attended: signal.attended,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Campaign dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {campaign.clientBrand} &middot; {campaign.topic} &middot;{' '}
            {portfolio.campaigns} campaigns, {portfolio.contacts} contacts, {portfolio.accounts} accounts
          </p>
        </div>
        <CampaignPicker
          campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
          value={campaign.id}
          basePath="/dashboard"
        />
      </div>

      {params.denied ? (
        <Alert variant="warning" title="Permission required">
          Your role cannot perform &ldquo;{params.denied}&rdquo;. Ask an administrator if you need access.
        </Alert>
      ) : null}

      {/* --- Qualification KPIs ------------------------------------------- */}
      <section aria-labelledby="kpis-qualification">
        <h2 id="kpis-qualification" className="mb-2 text-sm font-semibold text-navy-800">
          Qualification
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Total contacts" value={kpis.totalContacts} help="Contacts enrolled in this campaign." />
          <KpiCard label="P1" value={kpis.p1} tone="good" help="Score 80+, role relevance 18+, data quality 7+, both gates passed, and a written justification." />
          <KpiCard label="P2" value={kpis.p2} help="Score 60-79 with all gates passed, or a high scorer held back by a missing P1 requirement." />
          <KpiCard label="P3" value={kpis.p3} tone="warn" help="Score 40-59. Nurture only." />
          <KpiCard label="Reject" value={kpis.reject} tone="bad" help="Irrelevant, duplicate, outdated, or non-compliant." />
          <KpiCard label="Compliance hold" value={kpis.complianceHold} tone="warn" help="Compliance record incomplete - outreach paused." />
        </div>
      </section>

      {/* --- Quality and performance KPIs --------------------------------- */}
      <section aria-labelledby="kpis-performance">
        <h2 id="kpis-performance" className="mb-2 text-sm font-semibold text-navy-800">
          Data quality and performance
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Data-quality pass" value={percent(kpis.dataQualityPassRate)} help="Share of contacts scoring at least 7 of 10 on data quality and reachability." />
          <KpiCard label="Relevance-gate pass" value={percent(kpis.relevanceGatePassRate)} help="Share of contacts passing all eight mandatory relevance checks." />
          <KpiCard label="Email delivery" value={percent(kpis.emailDeliveryRate)} hint={`${kpis.emailsSent} sent`} help="Delivered or logged emails as a share of emails sent." />
          <KpiCard label="Positive reply" value={percent(kpis.positiveReplyRate)} help="Positive replies as a share of emails sent." />
          <KpiCard label="Registration" value={percent(kpis.webinarRegistrationRate)} help="Registrations as a share of contacts actually reached." />
          <KpiCard label="Live attendance" value={percent(kpis.liveAttendanceRate)} help="Attendees as a share of registrations." />
        </div>
      </section>

      <section aria-labelledby="kpis-commercial">
        <h2 id="kpis-commercial" className="mb-2 text-sm font-semibold text-navy-800">
          Commercial outcome
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Avg attendance duration" value={`${kpis.averageAttendanceDuration}%`} help="Average share of the session attended, from the attendance-tier events." />
          <KpiCard label="One-to-one meetings" value={kpis.meetingRequests} tone="good" help="Contacts who requested a meeting." />
          <KpiCard label="Verified attendees" value={kpis.verifiedAttendees} help="Distinct contacts with a recorded attendance event." />
          <KpiCard
            label="Cost per verified attendee"
            value={formatCurrency(kpis.costPerVerifiedAttendee, kpis.currency)}
            hint={kpis.campaignCost !== null ? `Campaign cost ${formatCurrency(kpis.campaignCost, kpis.currency)}` : 'Set a campaign cost'}
            help="Campaign cost divided by the number of verified attendees. Edit the cost on the campaign page."
          />
        </div>
      </section>

      {/* --- Charts -------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contacts by priority</CardTitle>
            <CardDescription>Where the imported list actually landed after scoring.</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityBarChart data={charts.contactsByPriority} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funnel: imported contact to meeting</CardTitle>
            <CardDescription>Each stage counts distinct contacts.</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart data={charts.funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration and attendance by priority</CardTitle>
            <CardDescription>Does the priority band predict who actually turns up?</CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationByPriorityChart data={charts.registrationByPriority} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
            <CardDescription>Total score across the whole enrolled list.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart data={charts.scoreDistribution} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Engagement events over time</CardTitle>
            <CardDescription>All recorded events, with genuine intent signals highlighted.</CardDescription>
          </CardHeader>
          <CardContent>
            <EventsOverTimeChart data={charts.eventsOverTime} />
          </CardContent>
        </Card>
      </div>

      {/* --- Old method versus SIGNAL -------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Old method versus SIGNAL method</CardTitle>
          <CardDescription>
            The surface-level list is what the pre-SIGNAL filter (industry, geography and a title
            keyword) would have selected from exactly the same data. Both lists carry the same
            campaign cost.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MethodComparisonChart data={comparisonChartData} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">List size</TableHead>
                <TableHead className="text-right">Registered</TableHead>
                <TableHead className="text-right">Attended</TableHead>
                <TableHead className="text-right">Registration rate</TableHead>
                <TableHead className="text-right">Attendance rate</TableHead>
                <TableHead className="text-right">Positive reply</TableHead>
                <TableHead className="text-right">Meeting rate</TableHead>
                <TableHead className="text-right">Cost / attendee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.comparison.map((row) => (
                <TableRow key={row.method}>
                  <TableCell className="font-medium">{row.method}</TableCell>
                  <TableCell className="numeric text-right">{row.listSize}</TableCell>
                  <TableCell className="numeric text-right">{row.registered}</TableCell>
                  <TableCell className="numeric text-right">{row.attended}</TableCell>
                  <TableCell className="numeric text-right">{percent(row.registrationRate)}</TableCell>
                  <TableCell className="numeric text-right">{percent(row.attendanceRate)}</TableCell>
                  <TableCell className="numeric text-right">{percent(row.positiveResponseRate)}</TableCell>
                  <TableCell className="numeric text-right">{percent(row.meetingRate)}</TableCell>
                  <TableCell className="numeric text-right">
                    {formatCurrency(row.costPerVerifiedAttendee, comparison.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- Account-level engagement -------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Account-level engagement</CardTitle>
          <CardDescription>
            Shown separately from individual contact scores, so the reason for any one contact&rsquo;s
            score stays visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topAccounts.length > 0 ? <AccountEngagementChart data={topAccounts} /> : null}
          <ul className="grid gap-2 md:grid-cols-2">
            {accountSignals
              .filter((signal) => signal.note)
              .slice(0, 8)
              .map((signal) => (
                <li
                  key={signal.accountId}
                  className="flex items-center justify-between gap-3 rounded-md border border-navy-200 bg-navy-50/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">{signal.companyName}</p>
                    <p className="text-xs text-muted-foreground">{signal.note}</p>
                  </div>
                  <Badge variant={signal.meetingsRequested > 0 ? 'success' : 'info'}>
                    x{signal.multiplier.toFixed(2)}
                  </Badge>
                </li>
              ))}
          </ul>
          <Link href={`/campaigns/${campaign.id}`} className="text-sm font-medium text-primary hover:underline">
            Open the full campaign view &rarr;
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
