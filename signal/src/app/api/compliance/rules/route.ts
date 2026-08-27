import { NextResponse, type NextRequest } from 'next/server';
import { ConsentRequirement } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LEGAL_DISCLAIMER } from '@/lib/domain/compliance-gate';
import { apiError } from '@/lib/api';

/** GET /api/compliance/rules - the configured country rules. */
export async function GET() {
  try {
    await requireApiCapability('contact:view');
    const rules = await prisma.countryComplianceRule.findMany({ orderBy: { country: 'asc' } });
    return NextResponse.json({ rules, disclaimer: LEGAL_DISCLAIMER });
  } catch (error) {
    return apiError(error);
  }
}

const schema = z.object({
  country: z.string().min(2),
  emailRequirement: z.nativeEnum(ConsentRequirement),
  phoneRequirement: z.nativeEnum(ConsentRequirement),
  whatsappRequirement: z.nativeEnum(ConsentRequirement),
  requiredFields: z.array(z.string()).default([]),
  noticeRequired: z.boolean().default(false),
  notes: z.string().optional(),
});

/** PUT /api/compliance/rules - create or replace one country's rule. */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireApiCapability('compliance:manage');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const rule = await prisma.countryComplianceRule.upsert({
      where: { country: parsed.data.country },
      create: { ...parsed.data, updatedBy: user.email },
      update: { ...parsed.data, updatedBy: user.email },
    });
    return NextResponse.json({ ok: true, rule, disclaimer: LEGAL_DISCLAIMER });
  } catch (error) {
    return apiError(error);
  }
}
