import Link from 'next/link';
import { DataConfidence, EmailStatus, PhoneStatus, RoleCategory } from '@prisma/client';
import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { STALE_AFTER_DAYS, STALE_WARNING_DAYS } from '@/lib/domain/constants';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { daysSince, formatDate, humanize } from '@/lib/utils';

const STALE_CUTOFF = () => new Date(Date.now() - STALE_AFTER_DAYS * 86_400_000);
const WARNING_CUTOFF = () => new Date(Date.now() - STALE_WARNING_DAYS * 86_400_000);

export default async function DataQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ issue?: string; verifiedBefore?: string; emailStatus?: string; phoneStatus?: string; roleConfidence?: string }>;
}) {
  await requireCapability('contact:view');
  const params = await searchParams;

  const [
    total,
    missingEmail,
    missingPhone,
    duplicates,
    unverifiedRole,
    missingCompliance,
    stale,
    invalidEmail,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { OR: [{ workEmail: null }, { emailStatus: EmailStatus.MISSING }] } }),
    prisma.contact.count({ where: { OR: [{ phoneNumber: null }, { phoneStatus: PhoneStatus.MISSING }] } }),
    prisma.contact.count({ where: { isDuplicate: true } }),
    prisma.contact.count({
      where: {
        OR: [
          { roleCategory: RoleCategory.UNKNOWN },
          { roleConfidence: { in: [DataConfidence.LOW, DataConfidence.UNVERIFIED] } },
        ],
      },
    }),
    prisma.contact.count({
      where: {
        OR: [
          { complianceRecords: { none: {} } },
          { complianceRecords: { some: { lawfulBasis: 'NOT_DETERMINED' } } },
        ],
      },
    }),
    prisma.contact.count({
      where: { OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: STALE_CUTOFF() } }] },
    }),
    prisma.contact.count({
      where: { emailStatus: { in: [EmailStatus.INVALID, EmailStatus.BOUNCED, EmailStatus.RISKY] } },
    }),
  ]);

  const valid = total - duplicates - stale;

  // The listed issue drives which contacts are shown below.
  const issueFilters: Record<string, Parameters<typeof prisma.contact.findMany>[0]> = {
    missingEmail: { where: { OR: [{ workEmail: null }, { emailStatus: EmailStatus.MISSING }] } },
    missingPhone: { where: { OR: [{ phoneNumber: null }, { phoneStatus: PhoneStatus.MISSING }] } },
    duplicates: { where: { isDuplicate: true } },
    unverifiedRole: {
      where: {
        OR: [
          { roleCategory: RoleCategory.UNKNOWN },
          { roleConfidence: { in: [DataConfidence.LOW, DataConfidence.UNVERIFIED] } },
        ],
      },
    },
    missingCompliance: {
      where: {
        OR: [
          { complianceRecords: { none: {} } },
          { complianceRecords: { some: { lawfulBasis: 'NOT_DETERMINED' } } },
        ],
      },
    },
    stale: { where: { OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: STALE_CUTOFF() } }] } },
    invalidEmail: {
      where: { emailStatus: { in: [EmailStatus.INVALID, EmailStatus.BOUNCED, EmailStatus.RISKY] } },
    },
  };

  const issue = params.issue && issueFilters[params.issue] ? params.issue : 'stale';
  const baseWhere = (issueFilters[issue]?.where ?? {}) as Record<string, unknown>;

  const extraWhere: Record<string, unknown> = {};
  if (params.verifiedBefore) extraWhere.lastVerifiedAt = { lt: new Date(params.verifiedBefore) };
  if (params.emailStatus) extraWhere.emailStatus = params.emailStatus;
  if (params.phoneStatus) extraWhere.phoneStatus = params.phoneStatus;
  if (params.roleConfidence) extraWhere.roleConfidence = params.roleConfidence;

  const contacts = await prisma.contact.findMany({
    where: { AND: [baseWhere, extraWhere] },
    include: { account: { select: { companyName: true, accountDataConfidence: true } }, complianceRecords: true },
    orderBy: { lastVerifiedAt: 'asc' },
    take: 60,
  });

  const ISSUES: Array<[string, string, number]> = [
    ['stale', `Stale (>${STALE_AFTER_DAYS} days)`, stale],
    ['missingEmail', 'Missing email', missingEmail],
    ['missingPhone', 'Missing phone', missingPhone],
    ['duplicates', 'Duplicates', duplicates],
    ['unverifiedRole', 'Unverified role', unverifiedRole],
    ['missingCompliance', 'Missing compliance', missingCompliance],
    ['invalidEmail', 'Invalid or bounced email', invalidEmail],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Data quality</h1>
        <p className="text-sm text-muted-foreground">
          Records are counted against the same rules the relevance gate applies.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="Total records" value={total} />
        <KpiCard label="Valid" value={valid} tone="good" help="Not a duplicate and verified within the staleness limit." />
        <KpiCard label="Duplicates" value={duplicates} tone="bad" />
        <KpiCard label="Stale" value={stale} tone="warn" help={`Never verified, or last verified more than ${STALE_AFTER_DAYS} days ago.`} />
        <KpiCard label="Missing email" value={missingEmail} tone="warn" />
        <KpiCard label="Missing phone" value={missingPhone} tone="warn" help="Still workable: email becomes the qualification and nurture channel." />
        <KpiCard label="Unverified role" value={unverifiedRole} tone="warn" />
        <KpiCard label="Missing compliance" value={missingCompliance} tone="bad" />
      </div>

      <div className="flex flex-wrap gap-2">
        {ISSUES.map(([key, label, count]) => (
          <Button key={key} asChild size="sm" variant={issue === key ? 'default' : 'outline'}>
            <Link href={`/data-quality?issue=${key}`}>
              {label} ({count})
            </Link>
          </Button>
        ))}
      </div>

      <form method="get" className="grid gap-3 rounded-lg border border-navy-200 bg-card p-3 md:grid-cols-5">
        <input type="hidden" name="issue" value={issue} />
        <div className="space-y-1">
          <Label htmlFor="verifiedBefore">Last verified before</Label>
          <Input id="verifiedBefore" name="verifiedBefore" type="date" defaultValue={params.verifiedBefore ?? ''} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="emailStatus">Email status</Label>
          <Select id="emailStatus" name="emailStatus" defaultValue={params.emailStatus ?? ''}>
            <option value="">Any</option>
            {Object.values(EmailStatus).map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="phoneStatus">Phone status</Label>
          <Select id="phoneStatus" name="phoneStatus" defaultValue={params.phoneStatus ?? ''}>
            <option value="">Any</option>
            {Object.values(PhoneStatus).map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="roleConfidence">Role confidence</Label>
          <Select id="roleConfidence" name="roleConfidence" defaultValue={params.roleConfidence ?? ''}>
            <option value="">Any</option>
            {Object.values(DataConfidence).map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Records to fix</CardTitle>
          <CardDescription>
            Showing up to 60 records, oldest verification first. Warning threshold is{' '}
            {STALE_WARNING_DAYS} days; the hard limit is {STALE_AFTER_DAYS}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role confidence</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Last verified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => {
                const age = daysSince(contact.lastVerifiedAt);
                const compliance = contact.complianceRecords[0];
                return (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                        {contact.firstName} {contact.lastName}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{contact.jobTitle}</span>
                    </TableCell>
                    <TableCell className="text-xs">{contact.account.companyName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          contact.roleConfidence === DataConfidence.HIGH
                            ? 'success'
                            : contact.roleConfidence === DataConfidence.MEDIUM
                              ? 'info'
                              : 'warning'
                        }
                      >
                        {humanize(contact.roleConfidence)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{humanize(contact.emailStatus)}</TableCell>
                    <TableCell className="text-xs">{humanize(contact.phoneStatus)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          !compliance || compliance.lawfulBasis === 'NOT_DETERMINED' ? 'danger' : 'success'
                        }
                      >
                        {!compliance ? 'None' : humanize(compliance.lawfulBasis)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(contact.lastVerifiedAt)}
                      {age !== null ? (
                        <span
                          className={
                            age > STALE_AFTER_DAYS
                              ? 'ml-1 text-red-700'
                              : age > STALE_WARNING_DAYS
                                ? 'ml-1 text-amber-700'
                                : 'ml-1 text-muted-foreground'
                          }
                        >
                          ({age}d)
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
