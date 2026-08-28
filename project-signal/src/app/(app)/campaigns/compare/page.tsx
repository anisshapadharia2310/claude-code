import type { Metadata } from 'next';
import { MethodComparisonChart } from '@/components/charts/charts';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert, PageHeader } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { getRepository } from '@/server/repo';
import { getCampaignAnalytics } from '@/server/services/analytics';

export const metadata: Metadata = { title: 'Campaign comparison' };

export default async function ComparePage() {
  await requirePermission('viewDashboard');
  const repo = await getRepository();
  const campaigns = await repo.listCampaigns();
  const analytics = (await Promise.all(campaigns.map((campaign) => getCampaignAnalytics(repo, campaign.id))))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <>
      <PageHeader
        eyebrow="Method comparison"
        title="Surface-level list versus SIGNAL"
        description="The same contacts, the same event ledger, two ways of choosing who to call."
      />

      <Alert tone="info" className="mb-4" title="How the comparison is built">
        The surface-level list is reconstructed from the same data using the filtering the agency used before:
        a campaign keyword in the raw job title, plus a target country and a target industry. No ownership
        test, no trigger, no data-quality floor and no compliance gate. The SIGNAL list is the P1 and P2
        contacts. Both are measured against the same recorded engagement events, so the difference is the
        selection method, not the measurement.
      </Alert>

      <div className="space-y-4">
        {analytics.map((entry) => {
          const surface = entry.methodComparison[0]!;
          const signal = entry.methodComparison[1]!;
          const attendanceLift = surface.attendanceRate > 0
            ? ((signal.attendanceRate - surface.attendanceRate) / surface.attendanceRate) * 100
            : null;

          return (
            <Card key={entry.campaign.id}>
              <CardHeader
                title={entry.campaign.name}
                description={`${entry.campaign.clientBrand} · ${formatNumber(entry.kpis.totalContacts)} contacts scored`}
              />
              <CardBody className="grid gap-5 lg:grid-cols-2">
                <MethodComparisonChart data={entry.methodComparison} />

                <div>
                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Measure</Th>
                          <Th numeric>Surface-level</Th>
                          <Th numeric>SIGNAL</Th>
                        </tr>
                      </thead>
                      <tbody>
                        <Tr>
                          <Td>List size</Td>
                          <Td numeric>{formatNumber(surface.listSize)}</Td>
                          <Td numeric className="font-semibold text-navy-900">{formatNumber(signal.listSize)}</Td>
                        </Tr>
                        <Tr>
                          <Td>Registration rate</Td>
                          <Td numeric>{formatPercent(surface.registrationRate)}</Td>
                          <Td numeric className="font-semibold text-navy-900">{formatPercent(signal.registrationRate)}</Td>
                        </Tr>
                        <Tr>
                          <Td>Attendance rate</Td>
                          <Td numeric>{formatPercent(surface.attendanceRate)}</Td>
                          <Td numeric className="font-semibold text-navy-900">{formatPercent(signal.attendanceRate)}</Td>
                        </Tr>
                        <Tr>
                          <Td>Positive response rate</Td>
                          <Td numeric>{formatPercent(surface.positiveResponseRate)}</Td>
                          <Td numeric className="font-semibold text-navy-900">{formatPercent(signal.positiveResponseRate)}</Td>
                        </Tr>
                        <Tr>
                          <Td>Meeting rate</Td>
                          <Td numeric>{formatPercent(surface.meetingRate)}</Td>
                          <Td numeric className="font-semibold text-navy-900">{formatPercent(signal.meetingRate)}</Td>
                        </Tr>
                        <Tr>
                          <Td>Cost per verified attendee</Td>
                          <Td numeric>
                            {surface.costPerVerifiedAttendee === null ? '-' : formatCurrency(surface.costPerVerifiedAttendee, entry.kpis.currency)}
                          </Td>
                          <Td numeric className="font-semibold text-navy-900">
                            {signal.costPerVerifiedAttendee === null ? '-' : formatCurrency(signal.costPerVerifiedAttendee, entry.kpis.currency)}
                          </Td>
                        </Tr>
                      </tbody>
                    </Table>
                  </TableWrap>

                  {attendanceLift !== null ? (
                    <p className="mt-3 text-sm leading-relaxed text-navy-600">
                      Attendance per contact worked is{' '}
                      <span className="font-semibold text-navy-900">
                        {attendanceLift >= 0 ? '+' : ''}{attendanceLift.toFixed(0)}%
                      </span>{' '}
                      on the SIGNAL list against the surface-level list, over{' '}
                      {formatNumber(signal.listSize)} contacts instead of {formatNumber(surface.listSize)}.
                      Cost per attendee is the figure to argue with a client about: the same spend divided by
                      the people who actually turned up.
                    </p>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
