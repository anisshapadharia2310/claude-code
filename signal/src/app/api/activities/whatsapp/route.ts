import { NextResponse, type NextRequest } from 'next/server';
import { WhatsAppMessageType } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { logWhatsApp } from '@/lib/services/outreach-service';
import { apiError } from '@/lib/api';

const schema = z.object({
  campaignContactId: z.string().min(1),
  messageType: z.nativeEnum(WhatsAppMessageType).default(WhatsAppMessageType.CUSTOM),
  messageText: z.string().min(10),
});

/**
 * POST /api/activities/whatsapp - record a WhatsApp message.
 * Refused with 500 and an explanation when the contact has not opted in, even if
 * the caller bypasses the interface.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiCapability('outreach:perform');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { activity, result } = await logWhatsApp(parsed.data);
    return NextResponse.json({ ok: true, activityId: activity.id, result }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
