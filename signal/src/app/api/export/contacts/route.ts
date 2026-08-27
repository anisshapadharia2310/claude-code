import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthError, requireApiCapability } from '@/lib/auth';
import { exportCampaignContacts } from '@/lib/repositories/campaign-contact-repository';
import { parseContactFilters } from '@/lib/filters';

/** Escapes a value for CSV, quoting anything containing a delimiter or quote. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const COLUMNS = [
  'Priority',
  'Total score',
  'Company fit',
  'Role relevance',
  'Trigger',
  'Engagement',
  'Data quality',
  'Attendance likelihood',
  'Engagement bonus',
  'Relevance gate',
  'Compliance gate',
  'First name',
  'Last name',
  'Job title',
  'Role category',
  'Seniority',
  'Decision role',
  'Department',
  'Company',
  'Domain',
  'Industry',
  'Country',
  'City',
  'Time zone',
  'Work email',
  'Email status',
  'Phone number',
  'Phone status',
  'WhatsApp status',
  'Consent status',
  'Last verified',
  'Contact source',
  'Campaign',
  'Recommended channel',
  'Recommended next action',
  'Why this contact',
  'Assigned to',
  'Current status',
  'Next follow-up',
];

/**
 * GET /api/export/contacts
 * Exports the current filtered contact view as CSV. Accepts exactly the same
 * query parameters as the contacts screen, so an export always matches what the
 * user is looking at.
 */
export async function GET(request: NextRequest) {
  try {
    await requireApiCapability('export:perform');
  } catch (error) {
    const authError = error as ApiAuthError;
    return NextResponse.json({ error: authError.message }, { status: authError.status ?? 500 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const multi: Record<string, string[]> = {};
  for (const key of request.nextUrl.searchParams.keys()) {
    multi[key] = request.nextUrl.searchParams.getAll(key);
  }

  const rows = await exportCampaignContacts(parseContactFilters({ ...params, ...multi }));

  const lines = [COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.priority,
        row.totalScore,
        row.fitScore,
        row.roleRelevanceScore,
        row.triggerScore,
        row.engagementScore,
        row.dataQualityScore,
        row.attendanceLikelihoodScore,
        row.engagementBonus,
        row.relevanceGatePassed ? 'PASS' : 'FAIL',
        row.complianceGatePassed ? 'PASS' : 'FAIL',
        row.contact.firstName,
        row.contact.lastName,
        row.contact.jobTitle,
        row.contact.roleCategory,
        row.contact.seniority,
        row.contact.decisionRole,
        row.contact.department,
        row.contact.account.companyName,
        row.contact.account.domain,
        row.contact.account.industry,
        row.contact.country,
        row.contact.city,
        row.contact.timeZone,
        row.contact.workEmail,
        row.contact.emailStatus,
        row.contact.phoneNumber,
        row.contact.phoneStatus,
        row.contact.whatsappStatus,
        row.contact.consentStatus,
        row.contact.lastVerifiedAt,
        row.contact.contactSource,
        row.campaign.name,
        row.recommendedChannel,
        row.recommendedNextAction,
        row.whyThisContact,
        row.assignedTo?.name,
        row.currentStatus,
        row.nextFollowUpAt,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  const filename = `signal-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
