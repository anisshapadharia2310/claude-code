import { NextResponse } from 'next/server';
import { ScoreChangeSource } from '@prisma/client';
import { requireApiCapability } from '@/lib/auth';
import { rescoreCampaign } from '@/lib/services/scoring-service';
import { apiError } from '@/lib/api';

/** POST /api/campaigns/:id/rescore - re-run the engine over every contact. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiCapability('campaign:manage');
    const { id } = await params;
    const result = await rescoreCampaign(id, {
      source: ScoreChangeSource.SCORING_ENGINE,
      reason: 'Re-score requested through the API.',
      changedById: user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
