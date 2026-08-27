import { NextResponse, type NextRequest } from 'next/server';
import { EventType } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { recordEngagementEvent } from '@/lib/services/outreach-service';
import { apiError } from '@/lib/api';

const schema = z.object({
  campaignId: z.string().min(1),
  contactId: z.string().min(1),
  eventType: z.nativeEnum(EventType),
  eventDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/events - record an engagement event.
 * This is the webhook-shaped entry point a marketing platform would call. The
 * event awards its post-webinar points and immediately re-scores the contact.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiCapability('contact:edit');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const event = await recordEngagementEvent({
      campaignId: parsed.data.campaignId,
      contactId: parsed.data.contactId,
      eventType: parsed.data.eventType,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : undefined,
      metadata: parsed.data.metadata,
      changedById: user.id,
    });
    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
