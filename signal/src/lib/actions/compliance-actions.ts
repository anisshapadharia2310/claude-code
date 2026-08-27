'use server';
import { revalidatePath } from 'next/cache';
import { Channel, ConsentRequirement, ConsentStatus, LawfulBasis, OptOutStatus, ScoreChangeSource } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rescoreCampaignContact } from '@/lib/services/scoring-service';
import type { ActionState } from './campaign-actions';

const ruleSchema = z.object({
  country: z.string().trim().min(2),
  emailRequirement: z.nativeEnum(ConsentRequirement),
  phoneRequirement: z.nativeEnum(ConsentRequirement),
  whatsappRequirement: z.nativeEnum(ConsentRequirement),
  noticeRequired: z.coerce.boolean(),
  requiredFields: z.array(z.string()),
  notes: z.string().trim().optional(),
});

/**
 * Country compliance rules are configuration, not code. The application never
 * hard-codes a legal conclusion; an administrator sets the requirement per
 * country after taking advice.
 */
export async function saveCountryRuleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireApiCapability('compliance:manage');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = ruleSchema.safeParse({
    country: formData.get('country'),
    emailRequirement: formData.get('emailRequirement'),
    phoneRequirement: formData.get('phoneRequirement'),
    whatsappRequirement: formData.get('whatsappRequirement'),
    noticeRequired: formData.get('noticeRequired') === 'on',
    requiredFields: formData.getAll('requiredFields').map(String),
    notes: formData.get('notes') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.countryComplianceRule.upsert({
    where: { country: parsed.data.country },
    create: { ...parsed.data, updatedBy: user.email },
    update: { ...parsed.data, updatedBy: user.email },
  });

  revalidatePath('/compliance');
  return {
    ok: true,
    message: `Rule saved for ${parsed.data.country}. Re-score affected campaigns to apply it.`,
  };
}

const recordSchema = z.object({
  contactId: z.string().min(1),
  country: z.string().trim().min(2),
  consentStatus: z.nativeEnum(ConsentStatus),
  consentSource: z.string().trim().optional(),
  consentDate: z.string().trim().optional(),
  lawfulBasis: z.nativeEnum(LawfulBasis),
  noticeProvided: z.coerce.boolean(),
  optOutStatus: z.nativeEnum(OptOutStatus),
  allowedChannels: z.array(z.nativeEnum(Channel)),
  blockedChannels: z.array(z.nativeEnum(Channel)),
  complianceNotes: z.string().trim().optional(),
});

/** Completing a compliance record lifts a COMPLIANCE_HOLD on re-scoring. */
export async function saveComplianceRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireApiCapability('compliance:manage');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = recordSchema.safeParse({
    contactId: formData.get('contactId'),
    country: formData.get('country'),
    consentStatus: formData.get('consentStatus'),
    consentSource: formData.get('consentSource') ?? undefined,
    consentDate: formData.get('consentDate') ?? undefined,
    lawfulBasis: formData.get('lawfulBasis'),
    noticeProvided: formData.get('noticeProvided') === 'on',
    optOutStatus: formData.get('optOutStatus'),
    allowedChannels: formData.getAll('allowedChannels').map(String),
    blockedChannels: formData.getAll('blockedChannels').map(String),
    complianceNotes: formData.get('complianceNotes') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;

  const existing = await prisma.complianceRecord.findFirst({
    where: { contactId: input.contactId },
    orderBy: { updatedAt: 'desc' },
  });

  const data = {
    contactId: input.contactId,
    country: input.country,
    consentStatus: input.consentStatus,
    consentSource: input.consentSource || null,
    consentDate: input.consentDate ? new Date(input.consentDate) : null,
    lawfulBasis: input.lawfulBasis,
    noticeProvided: input.noticeProvided,
    optOutStatus: input.optOutStatus,
    allowedChannels: input.allowedChannels,
    blockedChannels: input.blockedChannels,
    complianceNotes: input.complianceNotes || null,
    reviewedAt: new Date(),
    reviewedById: user.id,
  };

  if (existing) await prisma.complianceRecord.update({ where: { id: existing.id }, data });
  else await prisma.complianceRecord.create({ data });

  // Keep the denormalised consent flag on the contact aligned with the record.
  await prisma.contact.update({
    where: { id: input.contactId },
    data: { consentStatus: input.consentStatus },
  });

  const enrolments = await prisma.campaignContact.findMany({
    where: { contactId: input.contactId },
    select: { id: true },
  });
  for (const enrolment of enrolments) {
    await rescoreCampaignContact(enrolment.id, {
      source: ScoreChangeSource.COMPLIANCE_UPDATE,
      reason: 'Compliance record updated.',
      changedById: user.id,
    });
  }

  revalidatePath('/compliance');
  revalidatePath(`/contacts/${input.contactId}`);
  return { ok: true, message: `Compliance record saved; ${enrolments.length} enrolments re-scored.` };
}
