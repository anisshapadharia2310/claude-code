import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { can, requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFilterOptions, searchCampaignContacts } from '@/lib/repositories/campaign-contact-repository';
import { buildQuery, parseContactFilters } from '@/lib/filters';
import { ContactFilters } from '@/components/contact-filters';
import { ContactTable, type ContactRow } from '@/components/contact-table';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCapability('contact:view');
  const params = await searchParams;
  const filters = parseContactFilters(params);

  const [{ rows, total, page, pages }, options, campaigns] = await Promise.all([
    searchCampaignContacts(filters),
    getFilterOptions(),
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }),
  ]);

  const tableRows: ContactRow[] = rows.map((row) => ({
    id: row.id,
    contactId: row.contactId,
    name: `${row.contact.firstName} ${row.contact.lastName}`,
    jobTitle: row.contact.jobTitle,
    roleCategory: row.contact.roleCategory,
    company: row.contact.account.companyName,
    country: row.contact.country,
    timeZone: row.contact.timeZone,
    priority: row.priority,
    totalScore: row.totalScore,
    roleRelevanceScore: row.roleRelevanceScore,
    triggerScore: row.triggerScore,
    dataQualityScore: row.dataQualityScore,
    attendanceLikelihoodScore: row.attendanceLikelihoodScore,
    emailStatus: row.contact.emailStatus,
    phoneStatus: row.contact.phoneStatus,
    consentStatus: row.contact.consentStatus,
    currentStatus: row.currentStatus,
    assignedTo: row.assignedTo?.name ?? null,
    lastVerifiedAt: row.contact.lastVerifiedAt?.toISOString() ?? null,
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    campaignName: row.campaign.name,
    whyThisContact: row.whyThisContact,
    humanReviewRequired: row.humanReviewRequired,
  }));

  const exportHref = `/api/export/contacts?${buildQuery(params, {})}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {total} matching contact{total === 1 ? '' : 's'}. Every score is explained on the contact
            page.
          </p>
        </div>
      </div>

      <ContactFilters options={{ ...options, campaigns }} />

      {tableRows.length === 0 ? (
        <EmptyState
          title="No contacts match these filters"
          description="Try clearing a filter, or widen the score range."
        />
      ) : (
        <ContactTable
          rows={tableRows}
          callers={options.users.filter((u) => u.role === UserRole.CALLER || u.role === UserRole.RESEARCHER)}
          exportHref={exportHref}
          canEdit={can(user.role, 'contact:edit')}
        />
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
          <Button asChild size="sm" variant="outline" disabled={page <= 1}>
            <Link href={`/contacts?${buildQuery(params, { page: String(Math.max(1, page - 1)) })}`}>
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button asChild size="sm" variant="outline" disabled={page >= pages}>
            <Link href={`/contacts?${buildQuery(params, { page: String(Math.min(pages, page + 1)) })}`}>
              Next
            </Link>
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
