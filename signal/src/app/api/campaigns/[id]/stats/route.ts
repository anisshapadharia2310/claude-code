import { NextResponse } from 'next/server';
import { requireApiCapability } from '@/lib/auth';
import { getAccountSignals, getCampaignCharts, getCampaignKpis } from '@/lib/services/analytics-service';
import { apiError } from '@/lib/api';

/** GET /api/campaigns/:id/stats - KPIs, chart series and account signals. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiCapability('dashboard:view');
    const { id } = await params;
    const [kpis, charts, accountSignals] = await Promise.all([
      getCampaignKpis(id),
      getCampaignCharts(id),
      getAccountSignals(id),
    ]);
    return NextResponse.json({ kpis, charts, accountSignals });
  } catch (error) {
    return apiError(error);
  }
}
