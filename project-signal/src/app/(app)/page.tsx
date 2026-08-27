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
import { Alert, EmptyState, PageHeader, Stat } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { rescoreCampaignAction } from '@/server/actions/contacts';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';
import { getCampaignAnalytics } from '@/server/services/analytics';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requirePermission('viewDashboard');
  const campaign = await getSelectedCampaign();

  if (!campaign) {
    return <EmptyState title="No campaigns yet">Create a campaign to start qualifying contacts.</EmptyState>;
  }

  const repo = await getRepository();
  const analytics = await getCampaignAnalytics(repo, campaign.id);
  if (!analytics) return <EmptyState title="Campaign not found" />;

  const { kpis } = analytics;
  const surface = analytics.methodComparison[0]!;
  const signal = analytics.methodComparison[1]!;

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={
          <>
            {campaign.clientBrand} &middot; {campaign.campaignType === 'WEBINAR' ? 'Webinar' : 'White paper'} &middot;{' '}
            {campaign.targetBusinessProblem}
          </>
        }
        actions={
          <>
            <ButtonLink href="/campaigns/compare" variant="outline" size="sm">Compare methods</ButtonLink>
            {can(user.role, 'exportData') ? (
              <ButtonLink href={`/api/export/contacts?campaignId=${campaign.id}`} variant="outline" size="sm">
                Export CSV
              </ButtonLink>
            ) : null}
            {can(user.role, 'rescore') ? (
              <ActionForm action={rescoreCampaignAction} feedbackPosition="none" className="inline">
                <input type="hidden" name="campaignId" value={campaign.id} />
                <SubmitButton size="sm" variant="secondary" pendingLabel="Rescoring...">Rescore</SubmitButton>
              </ActionForm>
            ) : null}
          </>
        }
      />

      <section aria-label="Campaign key figures" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total contacts" value={formatNumber(kpis.totalContacts)} hint="In this campaign" />
        <Stat label="P1" value={formatNumber(kpis.byPriority.P1)} tone="p1"
          hint={`${kpis.awaitingApproval} awaiting approval`}
          tooltip="Highest priority: confirmed problem ownership, live trigger, verified data, all gates passed." />
        <Stat label="P2" value={formatNumber(kpis.byPriority.P2)} tone="p2"
          tooltip="Medium priority: qualifies on fit and role but short of the P1 bar." />
        <Stat label="P3" value={formatNumber(kpis.byPriority.P3)} tone="p3"
          tooltip="Low priority or nurture: relevant, but no live trigger or intent yet." />
        <Stat label="Reject" value={formatNumber(kpis.byPriority.REJECT)} tone="reject"
          tooltip="Irrelevant, duplicate, outdated or non-compliant." />
        <Stat label="Compliance hold" value={formatNumber(kpis.byPriority.COMPLIANCE_HOLD)} tone="hold"
          tooltip="Outreach blocked until the compliance record is completed." />
      </section>

      <section aria-label="Quality and engagement rates" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Data-quality pass" value={formatPercent(kpis.dataQualityPassRate)}
          tooltip="Contacts scoring at least 7 of 10 on data quality and reachability." />
        <Stat label="Relevance-gate pass" value={formatPercent(kpis.relevanceGatePassRate)}
          tooltip="Contacts that cleared every blocking relevance check." />
        <Stat label="Email delivery" value={formatPercent(kpis.emailDeliveryRate)}
          hint={`${formatNumber(kpis.emailsSent)} sent`} />
        <Stat label="Positive replies" value={formatPercent(kpis.positiveReplyRate)}
          tooltip="Distinct contacts who replied positively, over emails delivered." />
        <Stat label="Registration rate" value={formatPercent(kpis.webinarRegistrationRate)}
          hint={`${formatNumber(kpis.registrations)} registered`} />
        <Stat label="Live attendance" value={formatPercent(kpis.liveAttendanceRate)}
          hint={`${formatNumber(kpis.attendees)} attended`}
          tooltip="Attendees over registrations." />
      </section>

      <section aria-label="Outcome and cost" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Average attendance" value={formatPercent(kpis.averageAttendanceDuration, 0)}
          tooltip="Average share of the session attended, from the highest attendance tier each attendee reached." />
        <Stat label="Meeting requests" value={formatNumber(kpis.meetingRequests)} />
        <Stat label="Campaign cost"
          value={kpis.campaignCost === null ? 'Not set' : formatCurrency(kpis.campaignCost, kpis.currency)}
          hint={<Link href="/campaigns" className="text-brand-700 underline">Edit</Link>} />
        <Stat label="Cost per verified attendee"
          value={kpis.costPerVerifiedAttendee === null ? '-' : formatCurrency(kpis.costPerVerifiedAttendee, kpis.currency)}
          tooltip="Campaign cost divided by the number of contacts recorded as attending live." />
      </section>

      {kpis.awaitingApproval > 0 && can(user.role, 'approveP1') ? (
        <Alert tone="warning" className="mt-4" title={`${kpis.awaitingApproval} P1 contacts are waiting for approval`}>
          A P1 needs a written justification and a manager approval before it can be worked or exported as a P1.{' '}
          <Link href="/review" className="font-medium underline">Open the review queue</Link>.
        </Alert>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Contacts by priority" description="Where the imported list landed after scoring." />
          <CardBody><ContactsByPriorityChart data={analytics.contactsByPriority} /></CardBody>
        </Card>

        <Card>
          <CardHeader title="Funnel" description="From imported contact to requested meeting." />
          <CardBody><FunnelChart data={analytics.funnel} /></CardBody>
        </Card>

        <Card>
          <CardHeader title="Registration and attendance by priority"
            description="Whether the priority bands behave the way the model predicts." />
          <CardBody><RegistrationByPriorityChart data={analytics.registrationByPriority} /></CardBody>
        </Card>

        <Card>
          <CardHeader title="Score distribution" description="Total score across the campaign list." />
          <CardBody><ScoreDistributionChart data={analytics.scoreDistribution} /></CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Engagement events over time" description="Every recorded signal, by day." />
          <CardBody>
            {analytics.eventsOverTime.length > 0
              ? <EventsOverTimeChart data={analytics.eventsOverTime} />
              : <p className="py-8 text-center text-sm text-navy-500">No engagement events recorded yet.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Account-level engagement"
            description="Displayed separately from contact scores, so no individual score is silently inflated." />
          <CardBody>
            {analytics.accountEngagement.length > 0
              ? <AccountEngagementChart data={analytics.accountEngagement} />
              : <p className="py-8 text-center text-sm text-navy-500">No account has engaged yet.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Old method versus SIGNAL"
            description="The same campaign, measured against the list surface-level filtering would have produced." />
          <CardBody>
            <MethodComparisonChart data={analytics.methodComparison} />
            <TableWrap className="mt-4">
              <Table>
                <thead>
                  <tr>
                    <Th>Method</Th>
                    <Th className="text-right">List size</Th>
                    <Th className="text-right">Attendance</Th>
                    <Th className="text-right">Meetings</Th>
                    <Th className="text-right">Cost per attendee</Th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.methodComparison.map((row) => (
                    <Tr key={row.method}>
                      <Td>
                        <p className="font-medium text-navy-800">{row.method}</p>
                        <p className="text-xs text-navy-500">{row.description}</p>
                      </Td>
                      <Td className="tabular text-right">{formatNumber(row.listSize)}</Td>
                      <Td className="tabular text-right">{formatPercent(row.attendanceRate)}</Td>
                      <Td className="tabular text-right">{formatPercent(row.meetingRate)}</Td>
                      <Td className="tabular text-right">
                        {row.costPerVerifiedAttendee === null ? '-' : formatCurrency(row.costPerVerifiedAttendee, kpis.currency)}
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

      <Card className="mt-4">
        <CardHeader
          title="Account signals"
          description="Where more than one stakeholder from the same company has engaged."
        />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Company</Th>
                  <Th>Signal</Th>
                  <Th className="text-right">In campaign</Th>
                  <Th className="text-right">Registered</Th>
                  <Th className="text-right">Attended</Th>
                  <Th className="text-right">Engaged</Th>
                  <Th className="text-right">Meetings</Th>
                </tr>
              </thead>
              <tbody>
                {analytics.accountEngagement.slice(0, 12).map((row) => (
                  <Tr key={row.accountId}>
                    <Td>
                      <Link href={`/accounts/${row.accountId}`} className="font-medium text-brand-700 hover:underline">
                        {row.companyName}
                      </Link>
                    </Td>
                    <Td>
                      {row.message
                        ? <Badge tone={row.tier === 'STRONG' ? 'success' : 'info'}>{row.message}</Badge>
                        : <span className="text-xs text-navy-400">Single-stakeholder engagement</span>}
                    </Td>
                    <Td className="tabular text-right">{row.contactsInCampaign}</Td>
                    <Td className="tabular text-right">{row.registered}</Td>
                    <Td className="tabular text-right">{row.attended}</Td>
                    <Td className="tabular text-right">{row.engaged}</Td>
                    <Td className="tabular text-right">{row.meetingsRequested}</Td>
                  </Tr>
                ))}
                {analytics.accountEngagement.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-navy-500">
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
