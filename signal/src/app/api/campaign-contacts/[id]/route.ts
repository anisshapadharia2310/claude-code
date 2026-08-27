import { NextResponse } from 'next/server';
import { requireApiCapability } from '@/lib/auth';
import { previewScore } from '@/lib/services/scoring-service';
import { apiError } from '@/lib/api';

/**
 * GET /api/campaign-contacts/:id - the live, fully explained score for one
 * contact in one campaign: component scores, every criterion with its reason,
 * both gate results, the priority rationale and the recommended play.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiCapability('contact:view');
    const { id } = await params;
    return NextResponse.json(await previewScore(id));
  } catch (error) {
    return apiError(error);
  }
}
