import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AccountEngagementChart, ContactsByPriorityChart, EventsOverTimeChart, FunnelChart,
  MethodComparisonChart, RegistrationByPriorityChart, ScoreDistributionChart,
} from '@/components/charts/charts';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Alert, PageHeader, Progress, SectionHeading, Stat } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { rescoreCampaignAction } from '@/server/actions/contacts';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';
import { getCampaignAnalytics, getDataQualitySummary } from '@/server/services/analytics';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requirePermission('viewDashboard');
  const campaign = await getSelectedCampaign();

  if (!campaign) {
    return (
      <EmptyState title="No campaigns yet" icon="campaigns">
        Create a campaign to start qualifying contacts.
      </EmptyState>
    );
  }

  const repo = await getRepository();
  const [analytics, quality] = await Promise.all([
    getCampaignAnalytics(repo, campaign.id),
    getDataQualitySummary(repo),
  ]);
  if (!analytics) return <EmptyState title="Campaign not found" icon="campaigns" />;

  const { kpis } = analytics;
  const surface = analytics.methodComparison[0]!;
  const signal = analytics.methodComparison[1]!;
  const dataQualityIssues = quality.invalid + quality.missingCompliance;

  return (
    <>
      <PageHeader
        eyebrow={`${campaign.clientBrand} · ${campaign.campaignType === 'WEBINAR' ? 'Webinar' : 'White paper'}`}
        title={campaign.name}
        description={campaign.targetBusinessProblem}
        actions={
          <>
            <ButtonLink href="/campaigns/compare" variant="outline" size="sm" icon="trendUp">
              Compare methods
            </ButtonLink>
            {can(user.role, 'exportData') ? (
              <ButtonLink
                href={`/api/export/contacts?campaignId=${campaign.id}`}
                variant="outline"
                size="sm"
                icon="download"
              >
                Export CSV
              </ButtonLink>
            ) : null}
            {can(user.role, 'rescore') ? (
              <ActionForm action={rescoreCampaignAction} feedbackPosition="none" className="inline-flex">
                <input type="hidden" name="campaignId" value={campaign.id} />
                <SubmitButton size="sm" variant="secondary" icon="refresh" pendingLabel="Rescoring…">
                  Rescore
                </SubmitButton>
              </ActionForm>
            ) : null}
          </>
        }
      />

      {/* ================================================== headline metrics
          The six figures a manager needs before anything else. */}
      <section aria-labelledby="headline-metrics" className="mb-6">
        <h2 id="headline-metrics" className="sr-only">Headline metrics</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Stat
            label="P1 contacts" value={formatNumber(kpis.byPriority.P1)} tone="p1" icon="target" emphasis
            hint={kpis.awaitingApproval > 0 ? `${kpis.awaitingApproval} awaiting approval` : 'All approved'}
            tooltip="Highest priority: confirmed problem ownership, live trigger, verified data, all gates passed."
          />
          <Stat
            label="Live attendance" value={formatPercent(kpis.liveAttendanceRate)} tone="success" icon="campaigns" emphasis
            hint={`${formatNumber(kpis.attendees)} of ${formatNumber(kpis.registrations)} registered`}
            tooltip="Attendees over registrations."
          />
          <Stat
            label="Positive replies" value={formatPercent(kpis.positiveReplyRate)} tone="brand" icon="mail" emphasis
            hint={`${formatNumber(kpis.emailsSent)} emails sent`}
            tooltip="Distinct contacts who replied positively, over emails delivered."
          />
          <Stat
            label="Meeting requests" value={formatNumber(kpis.meetingRequests)} tone="success" icon="chat" emphasis
            hint="One-to-one meetings asked for"
          />
          <Stat
            label="Data-quality issues" value={formatNumber(dataQualityIssues)} tone="p2" icon="quality" emphasis
            hint={<Link href="/data-quality" className="text-brand-700 underline underline-offset-2">Open data quality</Link>}
            tooltip="Invalid records plus records missing required compliance information, across the whole database."
          />
          <Stat
            label="Compliance holds" value={formatNumber(kpis.byPriority.COMPLIANCE_HOLD)} tone="hold" icon="compliance" emphasis
            hint={<Link href="/compliance" className="text-brand-700 underline underline-offset-2">Open compliance</Link>}
            tooltip="Outreach blocked until the compliance record is completed."
          />
        </div>
      </section>

      {kpis.awaitingApproval > 0 && can(user.role, 'approveP1') ? (
        <Alert
          tone="warning"
          className="mb-6"
          title={`${kpis.awaitingApproval} P1 contacts are waiting for approval`}
        >
          A P1 needs a written justification and a manager approval before it can be worked or exported as a
          P1. <Link href="/review" className="font-semibold underline underline-offset-2">Open the review queue</Link>.
        </Alert>
      ) : null}

      {/* ================================================= priority breakdown */}
      <section aria-labelledby="priority-mix" className="mb-6">
        <SectionHeading
          title={<span id="priority-mix">Priority mix and qualification quality</span>}
          description={`${formatNumber(kpis.totalContacts)} contacts scored on this campaign.`}
          actions={<ButtonLink href="/contacts" variant="ghost" size="sm" trailingIcon="chevronRight">View contacts</ButtonLink>}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Stat label="Total contacts" value={formatNumber(kpis.totalContacts)} hint="In this campaign" />
          <Stat label="P2" value={formatNumber(kpis.byPriority.P2)} tone="p2"
            tooltip="Medium priority: qualifies on fit and role but short of the P1 bar." />
          <Stat label="P3" value={formatNumber(kpis.byPriority.P3)} tone="p3"
            tooltip="Low priority or nurture: relevant, but no live trigger or intent yet." />
          <Stat label="Reject" value={formatNumber(kpis.byPriority.REJECT)} tone="reject"
            tooltip="Irrelevant, duplicate, outdated or non-compliant." />
          <Stat label="Data-quality pass" value={formatPercent(kpis.dataQualityPassRate)}
            tooltip="Contacts scoring at least 7 of 10 on data quality and reachability." />
          <Stat label="Relevance-gate pass" value={formatPercent(kpis.relevanceGatePassRate)}
            tooltip="Contacts that cleared every blocking relevance check." />
        </div>
      </section>

      {/* =========================================================== economics */}
      <section aria-labelledby="campaign-economics" className="mb-6">
        <SectionHeading
          title={<span id="campaign-economics">Campaign economics</span>}
          description="The figures a client asks about."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Registration rate" value={formatPercent(kpis.webinarRegistrationRate)}
            hint={`${formatNumber(kpis.registrations)} registered`} />
          <Stat label="Average attendance" value={formatPercent(kpis.averageAttendanceDuration, 0)}
            tooltip="Average share of the session attended, from the highest attendance tier each attendee reached." />
          <Stat label="Campaign cost"
            value={kpis.campaignCost === null ? 'Not set' : formatCurrency(kpis.campaignCost, kpis.currency)}
            hint={<Link href="/campaigns" className="text-brand-700 underline underline-offset-2">Edit</Link>} />
          <Stat label="Cost per verified attendee" tone="brand"
            value={kpis.costPerVerifiedAttendee === null ? '—' : formatCurrency(kpis.costPerVerifiedAttendee, kpis.currency)}
            tooltip="Campaign cost divided by the number of contacts recorded as attending live." />
        </div>
      </section>

      {/* ============================================================= charts */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card accent="brand">
          <CardHeader
            title="Contacts by priority"
            description="Where the imported list landed after scoring."
            icon={<Icon name="dashboard" className="h-4 w-4" />}
          />
          <CardBody><ContactsByPriorityChart data={analytics.contactsByPriority} /></CardBody>
        </Card>

        <Card accent="accent">
          <CardHeader
            title="Funnel"
            description="From imported contact to requested meeting."
            icon={<Icon name="filter" className="h-4 w-4" />}
          />
          <CardBody><FunnelChart data={analytics.funnel} /></CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Registration and attendance by priority"
            description="Whether the priority bands behave the way the model predicts."
            icon={<Icon name="campaigns" className="h-4 w-4" />}
          />
          <CardBody><RegistrationByPriorityChart data={analytics.registrationByPriority} /></CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Score distribution"
            description="Total score across the campaign list, bucketed at the priority thresholds."
            icon={<Icon name="scoring" className="h-4 w-4" />}
          />
          <CardBody><ScoreDistributionChart data={analytics.scoreDistribution} /></CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Engagement events over time"
            description="Every recorded signal, by day."
            icon={<Icon name="trendUp" className="h-4 w-4" />}
          />
          <CardBody>
            {analytics.eventsOverTime.length > 0 ? (
              <EventsOverTimeChart data={analytics.eventsOverTime} />
            ) : (
              <p className="py-10 text-center text-sm text-navy-500">No engagement events recorded yet.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Account-level engagement"
            description="Displayed separately from contact scores, so no individual score is silently inflated."
            icon={<Icon name="accounts" className="h-4 w-4" />}
          />
          <CardBody>
            {analytics.accountEngagement.length > 0 ? (
              <AccountEngagementChart data={analytics.accountEngagement} />
            ) : (
              <p className="py-10 text-center text-sm text-navy-500">No account has engaged yet.</p>
            )}
          </CardBody>
        </Card>

        <Card accent="success">
          <CardHeader
            title="Old method versus SIGNAL"
            description="The same campaign, measured against the list surface-level filtering would have produced."
            icon={<Icon name="target" className="h-4 w-4" />}
          />
          <CardBody>
            <MethodComparisonChart data={analytics.methodComparison} />

            <TableWrap className="mt-4 rounded-lg border border-line">
              <Table>
                <thead>
                  <tr>
                    <Th>Method</Th>
                    <Th numeric>List size</Th>
                    <Th numeric>Attendance</Th>
                    <Th numeric>Meetings</Th>
                    <Th numeric>Cost / attendee</Th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.methodComparison.map((row, index) => (
                    <Tr key={row.method}>
                      <Td>
                        <p className="flex items-center gap-2 font-medium text-navy-800">
                          {index === 1 ? <Badge tone="brand" size="sm">SIGNAL</Badge> : null}
                          {row.method}
                        </p>
                        <p className="mt-0.5 text-xs leading-snug text-navy-500">{row.description}</p>
                      </Td>
                      <Td numeric>{formatNumber(row.listSize)}</Td>
                      <Td numeric className={index === 1 ? 'font-semibold text-navy-900' : ''}>
                        {formatPercent(row.attendanceRate)}
                      </Td>
                      <Td numeric className={index === 1 ? 'font-semibold text-navy-900' : ''}>
                        {formatPercent(row.meetingRate)}
                      </Td>
                      <Td numeric>
                        {row.costPerVerifiedAttendee === null
                          ? '—'
                          : formatCurrency(row.costPerVerifiedAttendee, kpis.currency)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            <p className="mt-3 text-xs leading-relaxed text-navy-500">
              The surface-level list is what a keyword-plus-geography-plus-industry filter would have produced
              on the same data: {formatNumber(surface.listSize)} contacts against SIGNAL&rsquo;s{' '}
              {formatNumber(signal.listSize)}. Both are measured against the same event ledger.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ==================================================== account signals */}
      <Card className="mt-4">
        <CardHeader
          title="Account signals"
          description="Where more than one stakeholder from the same company has engaged."
          icon={<Icon name="building" className="h-4 w-4" />}
        />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Company</Th>
                  <Th>Signal</Th>
                  <Th numeric>In campaign</Th>
                  <Th numeric>Registered</Th>
                  <Th numeric>Attended</Th>
                  <Th numeric>Engaged</Th>
                  <Th numeric>Meetings</Th>
                </tr>
              </thead>
              <tbody>
                {analytics.accountEngagement.slice(0, 12).map((row) => (
                  <Tr key={row.accountId}>
                    <Td>
                      <Link
                        href={`/accounts/${row.accountId}`}
                        className="font-medium text-navy-800 transition-colors hover:text-brand-700 hover:underline"
                      >
                        {row.companyName}
                      </Link>
                    </Td>
                    <Td>
                      {row.message ? (
                        <Badge tone={row.tier === 'STRONG' ? 'success' : 'info'} icon="spark">{row.message}</Badge>
                      ) : (
                        <span className="text-xs italic text-navy-400">Single-stakeholder engagement</span>
                      )}
                    </Td>
                    <Td numeric>{row.contactsInCampaign}</Td>
                    <Td numeric>{row.registered}</Td>
                    <Td numeric>{row.attended}</Td>
                    <Td numeric>
                      <span className="inline-flex w-full items-center justify-end gap-2">
                        <span className="hidden w-14 sm:block">
                          <Progress
                            value={row.engaged}
                            max={Math.max(row.contactsInCampaign, 1)}
                            size="sm"
                            tone="accent"
                            label={`${row.engaged} of ${row.contactsInCampaign} engaged`}
                          />
                        </span>
                        {row.engaged}
                      </span>
                    </Td>
                    <Td numeric>{row.meetingsRequested}</Td>
                  </Tr>
                ))}
                {analytics.accountEngagement.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-navy-500">
                      No account-level engagement recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>
    </>
  );
}
