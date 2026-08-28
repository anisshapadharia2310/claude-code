import { NextResponse } from 'next/server';
import { dataSource, getRepository } from '@/server/repo';

/** GET /api/health - readiness probe that also reports the active data source. */
export async function GET(): Promise<Response> {
  try {
    const repo = await getRepository();
    const campaigns = await repo.listCampaigns();
    return NextResponse.json({ ok: true, dataSource: dataSource(), campaigns: campaigns.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, dataSource: dataSource(), error: error instanceof Error ? error.message : 'Unavailable.' },
      { status: 503 },
    );
  }
}
