import { NextResponse, type NextRequest } from 'next/server';
import { EmailType } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { logEmail } from '@/lib/services/outreach-service';
import { apiError } from '@/lib/api';

const schema = z.object({
  campaignContactId: z.string().min(1),
  emailType: z.nativeEnum(EmailType).default(EmailType.CUSTOM),
  subject: z.string().min(3),
  body: z.string().min(20),
});

/**
 * POST /api/activities/email - draft and record an email.
 * With the default "log" provider nothing is transmitted; the response says
 * which provider handled the message.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiCapability('outreach:perform');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { activity, result } = await logEmail(parsed.data);
    return NextResponse.json({ ok: true, activityId: activity.id, result }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
