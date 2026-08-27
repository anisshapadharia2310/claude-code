import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';
import { rescoreCampaignContact } from '@/server/services/scoring';

/** POST /api/campaign-contacts/[id]/rescore - rescore the contact's campaign. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!can(user.role, 'rescore')) return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });

  const { id } = await params;
  const repo = await getRepository();
  try {
    await rescoreCampaignContact(repo, id, { actorId: user.id, reason: 'RESCORE', detail: 'Rescored via API.' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Rescore failed.' },
      { status: 404 },
    );
  }

  const link = await repo.getCampaignContact(id);
  return NextResponse.json({
    ok: true,
    priority: link?.priority,
    totalScore: link?.totalScore,
    humanReviewRequired: link?.humanReviewRequired,
  });
}
