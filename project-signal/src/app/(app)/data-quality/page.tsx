import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader, Progress, Stat } from '@/components/ui/misc';
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatDate, formatNumber, formatPercent, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { getRepository } from '@/server/repo';
import { getDataQualitySummary } from '@/server/services/analytics';

export const metadata: Metadata = { title: 'Data quality' };

const STALE_DAYS = 180;

export default async function DataQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ issue?: string }>;
}) {
  await requirePermission('viewDataQuality');
  const { issue } = await searchParams;

  const repo = await getRepository();
  const [summary, contacts] = await Promise.all([
    getDataQualitySummary(repo),
    repo.listContacts(),
  ]);

  const staleThreshold = Date.now() - STALE_DAYS * 86_400_000;

  const predicates: Record<string, (contact: (typeof contacts)[number]) => boolean> = {
    invalid: (contact) => contact.isDuplicate
      || (['INVALID', 'BOUNCED', 'MISSING'].includes(contact.emailStatus)
        && ['INVALID', 'WRONG_NUMBER', 'MISSING'].includes(contact.phoneStatus)),
    duplicates: (contact) => contact.isDuplicate,
    missingEmail: (contact) => ['INVALID', 'BOUNCED', 'MISSING'].includes(contact.emailStatus),
    missingPhone: (contact) => ['INVALID', 'WRONG_NUMBER', 'MISSING'].includes(contact.phoneStatus),
    unverifiedRole: (contact) => contact.roleCategory === 'UNKNOWN'
      || contact.roleConfidence === 'LOW' || contact.roleConfidence === 'UNKNOWN',
    missingCompliance: (contact) => {
      const record = contact.complianceRecords[0];
      return !record || record.lawfulBasis === 'NOT_DETERMINED' || record.consentStatus === 'NOT_CAPTURED';
    },
    stale: (contact) => Boolean(contact.lastVerifiedAt && contact.lastVerifiedAt.getTime() < staleThreshold),
    neverVerified: (contact) => contact.lastVerifiedAt === null,
  };

  const activeIssue = issue && predicates[issue] ? issue : 'invalid';
  const rows = contacts.filter(predicates[activeIssue]!).slice(0, 200);

  const cards: Array<[string, string, number, string]> = [
    ['invalid', 'Invalid records', summary.invalid, 'Duplicate, or no usable email and no usable phone.'],
    ['duplicates', 'Duplicate records', summary.duplicates, 'Matched an existing record on email, phone, domain or company plus name.'],
    ['missingEmail', 'Missing or unusable email', summary.missingEmail, 'Email is absent, invalid or bounced.'],
    ['missingPhone', 'Missing or unusable phone', summary.missingPhone, 'The system still qualifies these by email.'],
    ['unverifiedRole', 'Unverified role', summary.unverifiedRole, 'Role unknown or low confidence. Cannot reach P1.'],
    ['missingCompliance', 'Missing compliance', summary.missingCompliance, 'No lawful basis or no consent status recorded.'],
    ['stale', 'Stale records', summary.stale, `Last verified more than ${STALE_DAYS} days ago.`],
    ['neverVerified', 'Never verified', summary.neverVerified, 'No last-verified date on record.'],
  ];

  return (
    <>
      <PageHeader
        eyebrow="Whole database"
        title="Data quality"
        description="Reachability, verification and compliance completeness across every contact the agency holds."
        actions={<ButtonLink href="/import" variant="outline" size="sm" icon="import">Import more data</ButtonLink>}
      />

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total contacts" value={formatNumber(summary.total)} icon="contacts" emphasis />
        <Stat label="Valid records" value={formatNumber(summary.valid)} tone="success" icon="check" emphasis
          hint={`${formatPercent((summary.valid / Math.max(summary.total, 1)) * 100)} of the database`} />
        <Stat label="Invalid records" value={formatNumber(summary.invalid)} tone="reject" icon="ban" emphasis
          hint={`${formatPercent((summary.invalid / Math.max(summary.total, 1)) * 100)} of the database`} />
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([key, label, value, help]) => (
          <Link
            key={key}
            href={`/data-quality?issue=${key}`}
            className={`group rounded-xl border bg-surface px-4 py-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-sm ${
              activeIssue === key ? 'border-brand-600 ring-1 ring-brand-600/20' : 'border-line'
            }`}
            aria-current={activeIssue === key ? 'true' : undefined}
          >
            <p className="eyebrow">{label}</p>
            <p className="tabular mt-1.5 text-2xl font-semibold text-navy-900">{formatNumber(value)}</p>
            <div className="mt-2"><Progress value={value} max={Math.max(summary.total, 1)} tone="neutral" /></div>
            <p className="mt-2 text-[11px] leading-snug text-navy-500">{help}</p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader
          title={cards.find(([key]) => key === activeIssue)?.[1] ?? 'Records'}
          description={`Showing up to 200 records. Use the contact filters for a narrower query.`}
          actions={
            <ButtonLink href={`/contacts?verifiedBefore=${new Date(staleThreshold).toISOString().slice(0, 10)}`}
              variant="outline" size="sm">
              Open in contacts
            </ButtonLink>
          }
        />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Contact</Th><Th>Company</Th><Th>Email</Th><Th>Phone</Th>
                  <Th>Role confidence</Th><Th>Consent</Th><Th>Last verified</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <EmptyRow colSpan={7}>No records in this category.</EmptyRow> : null}
                {rows.map((contact) => (
                  <Tr key={contact.id}>
                    <Td>
                      <p className="font-medium text-navy-800">{contact.firstName} {contact.lastName}</p>
                      <p className="text-xs text-navy-500">{contact.jobTitle}</p>
                      {contact.isDuplicate ? (
                        <p className="text-xs font-medium text-amber-700">Duplicate of {contact.duplicateOfId}</p>
                      ) : null}
                    </Td>
                    <Td className="text-xs">
                      {contact.account.companyName}
                      <p className="text-navy-500">{contact.country}</p>
                    </Td>
                    <Td className="text-xs">
                      {contact.workEmail ?? '-'}
                      <p className="text-navy-500">{humanize(contact.emailStatus)}</p>
                    </Td>
                    <Td className="text-xs">
                      {contact.phoneNumber ?? '-'}
                      <p className="text-navy-500">{humanize(contact.phoneStatus)}</p>
                    </Td>
                    <Td className="text-xs">
                      {humanize(contact.roleConfidence)}
                      <p className="text-navy-500">{humanize(contact.roleCategory)}</p>
                    </Td>
                    <Td className="text-xs">{humanize(contact.consentStatus)}</Td>
                    <Td className="text-xs">{formatDate(contact.lastVerifiedAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>
    </>
  );
}
