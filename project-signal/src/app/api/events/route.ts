import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pointsForEvent } from '@/domain/engagement';
import { getSessionUser } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';
import { rescoreCampaign } from '@/server/services/scoring';

const schema = z.object({
  campaignId: z.string().min(1),
  contactId: z.string().min(1),
  eventType: z.enum([
    'WHITEPAPER_SENT', 'WHITEPAPER_DELIVERED', 'WHITEPAPER_OPENED', 'WHITEPAPER_DOWNLOADED',
    'EMAIL_SENT', 'EMAIL_DELIVERED', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_REPLIED',
    'POSITIVE_EMAIL_REPLY', 'WEBINAR_INVITATION_SENT', 'WEBINAR_REGISTERED', 'WEBINAR_ATTENDED',
    'WEBINAR_ATTENDANCE_50_PERCENT', 'WEBINAR_ATTENDANCE_75_PERCENT', 'WEBINAR_ATTENDANCE_80_PERCENT',
    'STAYED_FOR_QA', 'POLL_ANSWERED', 'QUESTION_ASKED', 'RESOURCE_DOWNLOADED', 'CTA_CLICKED',
    'REPLAY_WATCHED', 'MEETING_REQUESTED', 'CALL_CONNECTED', 'CALL_NO_ANSWER',
    'CALL_CALLBACK_REQUESTED', 'NOT_INTERESTED', 'OPTED_OUT',
  ]),
  eventDate: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Set false to batch several events before rescoring. */
  rescore: z.boolean().optional(),
});

/**
 * POST /api/events
 * Records an engagement event and, by default, rescores the campaign so the
 * effect is visible immediately. This is the integration point for a webinar
 * platform or an email service provider.
 */
export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!can(user.role, 'logOutreach') && !can(user.role, 'rescore')) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload.', issues: parsed.error.issues }, { status: 422 });
  }

  const repo = await getRepository();
  const event = await repo.createEngagementEvent({
    campaignId: parsed.data.campaignId,
    contactId: parsed.data.contactId,
    eventType: parsed.data.eventType,
    eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : new Date(),
    metadata: (parsed.data.metadata ?? undefined) as never,
    pointsAwarded: pointsForEvent(parsed.data.eventType),
  });

  if (parsed.data.rescore !== false) {
    await rescoreCampaign(repo, parsed.data.campaignId, {
      actorId: user.id,
      reason: 'ENGAGEMENT_EVENT',
      detail: `Event recorded via API: ${parsed.data.eventType}.`,
    });
  }

  return NextResponse.json({ ok: true, event }, { status: 201 });
}
