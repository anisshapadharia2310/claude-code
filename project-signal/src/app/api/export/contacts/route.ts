import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';
import { exportContactsCsv, exportFileName } from '@/server/services/export';
import { applyContactFilters, parseContactFilters, sortContacts } from '@/server/services/filters';

/**
 * GET /api/export/contacts
 * Query: campaignId (required), ids (optional comma list), plus any contact filter.
 * Returns the filtered list as CSV, including the score breakdown columns.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!can(user.role, 'exportData')) {
    return NextResponse.json({ error: 'Your role may not export data.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const campaignId = url.searchParams.get('campaignId');
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required.' }, { status: 400 });

  const repo = await getRepository();
  const campaign = await repo.getCampaign(campaignId);
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  const params: Record<string, string | string[]> = {};
  for (const key of url.searchParams.keys()) {
    const values = url.searchParams.getAll(key);
    params[key] = values.length > 1 ? values : values[0]!;
  }

  const links = await repo.listCampaignContacts(campaignId);
  const explicitIds = url.searchParams.get('ids');
  const selected = explicitIds
    ? new Set(explicitIds.split(',').map((id) => id.trim()).filter(Boolean))
    : null;

  const filters = parseContactFilters(params);
  const events = filters.eventType ? await repo.listEvents({ campaignId }) : [];
  const eventsByContact = new Map<string, typeof events>();
  for (const event of events) {
    const list = eventsByContact.get(event.contactId) ?? [];
    list.push(event);
    eventsByContact.set(event.contactId, list);
  }

  const rows = sortContacts(
    applyContactFilters(links, filters, { eventsByContact }).filter((row) => !selected || selected.has(row.id)),
    filters.sort,
    filters.dir,
  );

  return new NextResponse(exportContactsCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName(campaign.name)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
