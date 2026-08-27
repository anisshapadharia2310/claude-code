import { NextResponse, type NextRequest } from 'next/server';
import { requireApiCapability } from '@/lib/auth';
import { searchCampaignContacts } from '@/lib/repositories/campaign-contact-repository';
import { parseContactFilters } from '@/lib/filters';
import { apiError } from '@/lib/api';

/**
 * GET /api/contacts - filtered, sorted, paginated contact list.
 * Accepts the same query parameters as the contacts screen.
 */
export async function GET(request: NextRequest) {
  try {
    await requireApiCapability('contact:view');
    const multi: Record<string, string[]> = {};
    for (const key of request.nextUrl.searchParams.keys()) {
      multi[key] = request.nextUrl.searchParams.getAll(key);
    }
    const { rows, total, page, pages } = await searchCampaignContacts(parseContactFilters(multi));

    return NextResponse.json({
      total,
      page,
      pages,
      contacts: rows.map((row) => ({
        campaignContactId: row.id,
        contactId: row.contactId,
        name: `${row.contact.firstName} ${row.contact.lastName}`,
        jobTitle: row.contact.jobTitle,
        roleCategory: row.contact.roleCategory,
        company: row.contact.account.companyName,
        country: row.contact.country,
        priority: row.priority,
        totalScore: row.totalScore,
        components: {
          fit: row.fitScore,
          roleRelevance: row.roleRelevanceScore,
          trigger: row.triggerScore,
          engagement: row.engagementScore,
          dataQuality: row.dataQualityScore,
          attendance: row.attendanceLikelihoodScore,
        },
        relevanceGatePassed: row.relevanceGatePassed,
        complianceGatePassed: row.complianceGatePassed,
        whyThisContact: row.whyThisContact,
        recommendedChannel: row.recommendedChannel,
        recommendedNextAction: row.recommendedNextAction,
        currentStatus: row.currentStatus,
        assignedTo: row.assignedTo?.name ?? null,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
