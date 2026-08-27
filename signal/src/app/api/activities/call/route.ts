import { NextResponse, type NextRequest } from 'next/server';
import { CallOutcome } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { logCall } from '@/lib/services/outreach-service';
import { apiError } from '@/lib/api';

const schema = z.object({
  campaignContactId: z.string().min(1),
  outcome: z.nativeEnum(CallOutcome),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

/**
 * POST /api/activities/call - record a call outcome. Raises the matching
 * engagement event, updates the contact and status, and re-scores.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiCapability('outreach:perform');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const effect = await logCall({
      campaignContactId: parsed.data.campaignContactId,
      callerId: user.id,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes ?? null,
      nextAction: parsed.data.nextAction ?? null,
      nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
    });
    return NextResponse.json({ ok: true, effect }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
