import type { Metadata } from 'next';
import { ContactTable } from '@/components/contacts/contact-table';
import { FilterBar } from '@/components/contacts/filter-bar';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, PageHeader, SectionHeading, Stat } from '@/components/ui/misc';
import { toContactRow } from '@/lib/rows';
import { formatNumber } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';
import {
  applyContactFilters, filterOptions, parseContactFilters, sortContacts,
} from '@/server/services/filters';

export const metadata: Metadata = { title: 'Contacts' };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission('viewContacts');
  const campaign = await getSelectedCampaign();
  if (!campaign) return <EmptyState title="No campaigns yet" />;

  const params = await searchParams;
  const filters = parseContactFilters(params);

  const repo = await getRepository();
  const [links, users, events] = await Promise.all([
    repo.listCampaignContacts(campaign.id),
    repo.listUsers(),
    filters.eventType ? repo.listEvents({ campaignId: campaign.id }) : Promise.resolve([]),
  ]);

  const eventsByContact = new Map<string, typeof events>();
  for (const event of events) {
    const list = eventsByContact.get(event.contactId) ?? [];
    list.push(event);
    eventsByContact.set(event.contactId, list);
  }

  const filtered = sortContacts(
    applyContactFilters(links, filters, { eventsByContact }),
    filters.sort,
    filters.dir,
  );
  const rows = filtered.map(toContactRow);
  const callers = users.filter((entry) => entry.role === 'CALLER' || entry.role === 'MANAGER');

  const activeCount = [
    filters.priority, filters.country, filters.industry, filters.employeeBand,
    filters.seniority, filters.roleCategory, filters.technology, filters.trigger,
    filters.emailStatus, filters.phoneStatus, filters.whatsappStatus,
    filters.consentStatus, filters.status,
  ].filter((list) => list.length > 0).length
    + [filters.scoreMin, filters.scoreMax, filters.eventType, filters.assignedTo, filters.verifiedBefore]
      .filter((value) => value !== null).length
    + (filters.reviewOnly ? 1 : 0);

  const counts = {
    P1: rows.filter((row) => row.priority === 'P1').length,
    P2: rows.filter((row) => row.priority === 'P2').length,
    P3: rows.filter((row) => row.priority === 'P3').length,
    HOLD: rows.filter((row) => row.priority === 'COMPLIANCE_HOLD').length,
    REJECT: rows.filter((row) => row.priority === 'REJECT').length,
  };

  const exportQuery = new URLSearchParams();
  exportQuery.set('campaignId', campaign.id);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || key === 'campaignId') continue;
    for (const entry of Array.isArray(value) ? value : [value]) exportQuery.append(key, entry);
  }

  return (
    <>
      <PageHeader
        eyebrow={campaign.name}
        title="Contacts"
        description={`${formatNumber(rows.length)} of ${formatNumber(links.length)} contacts in this campaign. Every score can be opened and explained down to the field that produced it.`}
        actions={
          can(user.role, 'exportData')
            ? (
              <ButtonLink
                href={`/api/export/contacts?${exportQuery.toString()}`}
                variant="outline"
                size="sm"
                icon="download"
              >
                Export this view
              </ButtonLink>
            )
            : null
        }
      />

      <SectionHeading
        title="Result mix"
        description="How the current filters break down by priority."
      />
      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Showing" value={formatNumber(rows.length)} icon="contacts" />
        <Stat label="P1" value={formatNumber(counts.P1)} tone="p1" />
        <Stat label="P2" value={formatNumber(counts.P2)} tone="p2" />
        <Stat label="P3" value={formatNumber(counts.P3)} tone="p3" />
        <Stat label="Hold" value={formatNumber(counts.HOLD)} tone="hold" />
        <Stat label="Reject" value={formatNumber(counts.REJECT)} tone="reject" />
      </section>

      <div className="mb-5">
        <FilterBar
          filters={filters}
          options={filterOptions(links)}
          callers={callers}
          activeCount={activeCount}
        />
      </div>

      <ContactTable
        rows={rows}
        total={links.length}
        campaignId={campaign.id}
        callers={callers}
        canBulk={can(user.role, 'bulkUpdate')}
        canExport={can(user.role, 'exportData')}
      />
    </>
  );
}
