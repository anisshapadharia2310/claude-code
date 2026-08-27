import { NextResponse, type NextRequest } from 'next/server';
import { Prisma, ScoreChangeSource } from '@prisma/client';
import { requireApiCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveWeights, scoringWeightsSchema, validateWeights } from '@/lib/domain/scoring/weights';
import { rescoreCampaign } from '@/lib/services/scoring-service';
import { apiError } from '@/lib/api';

/** GET /api/campaigns/:id/weights - the campaign's effective scoring weights. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiCapability('campaign:view');
    const { id } = await params;
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({
      weights: resolveWeights(campaign.scoringWeights),
      isCustom: campaign.scoringWeights !== null,
    });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * PUT /api/campaigns/:id/weights - replace the weights and re-score.
 * Rejects any configuration that does not total exactly 100 points.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiCapability('scoring:configure');
    const { id } = await params;
    const body = await request.json();

    const validation = validateWeights(body.weights);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid scoring weights.', total: validation.total, details: validation.errors },
        { status: 400 },
      );
    }

    await prisma.campaign.update({
      where: { id },
      data: {
        scoringWeights: scoringWeightsSchema.parse(body.weights) as unknown as Prisma.InputJsonValue,
      },
    });
    const result = await rescoreCampaign(id, {
      source: ScoreChangeSource.WEIGHT_CHANGE,
      reason: 'Scoring weights updated through the API.',
      changedById: user.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}
