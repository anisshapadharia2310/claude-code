import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { InputWithIcon } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/misc';
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatNumber, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';

export const metadata: Metadata = { title: 'Accounts' };

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission('viewAccounts');
  const { q } = await searchParams;
  const campaign = await getSelectedCampaign();

  const repo = await getRepository();
  const [accounts, links] = await Promise.all([
    repo.listAccounts(),
    campaign ? repo.listCampaignContacts(campaign.id) : Promise.resolve([]),
  ]);

  const byAccount = new Map<string, typeof links>();
  for (const link of links) {
    const list = byAccount.get(link.contact.accountId) ?? [];
    list.push(link);
    byAccount.set(link.contact.accountId, list);
  }

  const needle = (q ?? '').trim().toLowerCase();
  const rows = accounts.filter((account) => !needle
    || account.companyName.toLowerCase().includes(needle)
    || account.industry.toLowerCase().includes(needle)
    || account.country.toLowerCase().includes(needle)
    || (account.domain ?? '').toLowerCase().includes(needle));

  return (
    <>
      <PageHeader
        eyebrow={campaign?.name ?? 'No campaign selected'}
        title="Accounts"
        description={`${formatNumber(accounts.length)} companies. Priority counts are for the selected campaign.`}
      />

      <form method="get" action="/accounts" className="mb-5 flex flex-wrap gap-2">
        <div className="min-w-[240px] flex-1 sm:max-w-sm">
          <label htmlFor="account-search" className="sr-only">Search accounts</label>
          <InputWithIcon
            id="account-search" name="q" type="search" defaultValue={q ?? ''}
            placeholder="Company, industry, country or domain"
          />
        </div>
        <Button type="submit" icon="search">Search</Button>
      </form>

      <Card>
        <CardHeader
          title="Company list"
          description="Trigger strength is what separates a fit from a live opportunity."
          icon={<Icon name="building" className="h-4 w-4" />}
        />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Company</Th><Th>Industry</Th><Th>Location</Th><Th>Size</Th>
                  <Th>Triggers</Th><Th numeric>In campaign</Th><Th numeric>P1 / P2</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <EmptyRow colSpan={7} /> : null}
                {rows.map((account) => {
                  const group = byAccount.get(account.id) ?? [];
                  const p1 = group.filter((link) => link.priority === 'P1').length;
                  const p2 = group.filter((link) => link.priority === 'P2').length;
                  const triggers = [
                    account.transformationActivity && 'Transformation',
                    account.relevantOpenJobPostings > 0 && `${account.relevantOpenJobPostings} roles`,
                    account.expansionActivity && 'Expansion',
                    account.mergerOrAcquisitionActivity && 'M&A',
                    account.leadershipChange && 'Leadership',
                    account.regulatoryPressure && 'Regulatory',
                  ].filter(Boolean) as string[];

                  return (
                    <Tr key={account.id}>
                      <Td>
                        <Link href={`/accounts/${account.id}`} className="font-medium text-brand-700 hover:underline">
                          {account.companyName}
                        </Link>
                        <p className="text-xs text-navy-500">{account.domain ?? 'no domain'}</p>
                        {account.namedAccountStatus ? <Badge tone="brand" className="mt-1">Named account</Badge> : null}
                      </Td>
                      <Td className="text-xs">
                        {account.industry}
                        <p className="text-navy-500">{account.subIndustry ?? ''}</p>
                      </Td>
                      <Td className="text-xs">{account.city ? `${account.city}, ` : ''}{account.country}</Td>
                      <Td className="text-xs">
                        {humanize(account.employeeBand)}
                        <p className="text-navy-500">{humanize(account.revenueBand)}</p>
                      </Td>
                      <Td className="max-w-64">
                        {triggers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {triggers.map((trigger) => (
                              <Badge key={trigger} tone={account.triggerVerification === 'VERIFIED' ? 'success' : 'warning'}
                                className="text-[10px]">
                                {trigger}
                              </Badge>
                            ))}
                          </div>
                        ) : <span className="text-xs text-navy-400">None recorded</span>}
                      </Td>
                      <Td numeric>{group.length}</Td>
                      <Td numeric>
                        <span className="font-semibold text-brand-700">{p1}</span>
                        <span className="text-navy-400"> / </span>
                        <span className="text-accent-700">{p2}</span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>
    </>
  );
}
