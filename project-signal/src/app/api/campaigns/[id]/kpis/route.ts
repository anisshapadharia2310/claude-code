import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';
import { getCampaignAnalytics } from '@/server/services/analytics';

/** GET /api/campaigns/[id]/kpis - campaign KPIs and chart series as JSON. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!can(user.role, 'viewDashboard')) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  const { id } = await params;
  const repo = await getRepository();
  const analytics = await getCampaignAnalytics(repo, id);
  if (!analytics) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  return NextResponse.json({
    campaign: { id: analytics.campaign.id, name: analytics.campaign.name },
    kpis: analytics.kpis,
    charts: {
      contactsByPriority: analytics.contactsByPriority,
      funnel: analytics.funnel,
      registrationByPriority: analytics.registrationByPriority,
      scoreDistribution: analytics.scoreDistribution,
      eventsOverTime: analytics.eventsOverTime,
      accountEngagement: analytics.accountEngagement,
    },
    methodComparison: analytics.methodComparison,
  });
}
