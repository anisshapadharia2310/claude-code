import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDate, humanize } from '@/lib/utils';

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCapability('contact:view');
  const { q } = await searchParams;

  const accounts = await prisma.account.findMany({
    where: q
      ? {
          OR: [
            { companyName: { contains: q, mode: 'insensitive' } },
            { domain: { contains: q, mode: 'insensitive' } },
            { industry: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: { _count: { select: { contacts: true } } },
    orderBy: { companyName: 'asc' },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          {accounts.length} companies. Trigger signals here feed component C of every contact&rsquo;s
          score.
        </p>
      </div>

      <form method="get" className="flex items-end gap-2 rounded-lg border border-navy-200 bg-card p-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="q">Search accounts</Label>
          <Input id="q" name="q" defaultValue={q ?? ''} placeholder="Company, domain, or industry" />
        </div>
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Account list</CardTitle>
          <CardDescription>
            Trigger verification state matters: an unverified trigger still scores, but flags the
            contact for research review. A trigger marked false scores nothing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead>Triggers</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const triggers = [
                  account.transformationActivity && 'Transformation',
                  account.relevantOpenJobPostings > 0 && `${account.relevantOpenJobPostings} roles`,
                  account.expansionActivity && 'Expansion',
                  account.mergerOrAcquisitionActivity && 'M&A',
                  account.leadershipChange && 'Leadership',
                  account.regulatoryPressure && 'Regulatory',
                  account.publiclyStatedPriority && 'Stated priority',
                ].filter(Boolean) as string[];

                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Link
                        href={`/contacts?q=${encodeURIComponent(account.companyName)}`}
                        className="font-medium text-navy-900 hover:underline"
                      >
                        {account.companyName}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{account.domain}</span>
                    </TableCell>
                    <TableCell className="text-xs">{account.industry}</TableCell>
                    <TableCell className="text-xs">
                      {account.city ? `${account.city}, ` : ''}
                      {account.country}
                    </TableCell>
                    <TableCell className="text-xs">
                      {humanize(account.employeeBand).replace('Band ', '')}
                    </TableCell>
                    <TableCell className="numeric text-right">{account._count.contacts}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {triggers.length > 0 ? (
                          triggers.map((trigger) => (
                            <Badge key={trigger} variant="info">
                              {trigger}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                      {account.recentBusinessTrigger ? (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {account.recentBusinessTrigger}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          account.triggerVerification === 'VERIFIED'
                            ? 'success'
                            : account.triggerVerification === 'FALSE_POSITIVE'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {humanize(account.triggerVerification)}
                      </Badge>
                      {account.triggerDate ? (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {formatDate(account.triggerDate)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">{humanize(account.accountDataConfidence)}</TableCell>
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
