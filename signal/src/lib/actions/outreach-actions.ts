'use server';
import { revalidatePath } from 'next/cache';
import { CallOutcome, EmailType, OutreachStatus, WhatsAppMessageType } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logCall, logEmail, logWhatsApp } from '@/lib/services/outreach-service';
import type { ActionState } from './campaign-actions';

const callSchema = z.object({
  campaignContactId: z.string().min(1),
  outcome: z.nativeEnum(CallOutcome),
  notes: z.string().trim().optional(),
  nextAction: z.string().trim().optional(),
  nextFollowUpAt: z.string().trim().optional(),
});

/** Records a call outcome, raising the engagement event and re-scoring. */
export async function logCallAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let user;
  try {
    user = await requireApiCapability('outreach:perform');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = callSchema.safeParse({
    campaignContactId: formData.get('campaignContactId'),
    outcome: formData.get('outcome'),
    notes: formData.get('notes') ?? undefined,
    nextAction: formData.get('nextAction') ?? undefined,
    nextFollowUpAt: formData.get('nextFollowUpAt') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const effect = await logCall({
    campaignContactId: parsed.data.campaignContactId,
    callerId: user.id,
    outcome: parsed.data.outcome,
    notes: parsed.data.notes ?? null,
    nextAction: parsed.data.nextAction ?? null,
    nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
  });

  revalidatePath('/outreach');
  revalidatePath(`/outreach/${parsed.data.campaignContactId}`);
  return { ok: true, message: effect.note };
}

const emailSchema = z.object({
  campaignContactId: z.string().min(1),
  emailType: z.nativeEnum(EmailType),
  subject: z.string().trim().min(3, 'Write a subject line.'),
  body: z.string().trim().min(20, 'The email body is too short to send.'),
});

/**
 * Logs an email. With the default provider nothing is transmitted: the first
 * version of SIGNAL never sends real mail.
 */
export async function logEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireApiCapability('outreach:perform');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = emailSchema.safeParse({
    campaignContactId: formData.get('campaignContactId'),
    emailType: formData.get('emailType'),
    subject: formData.get('subject'),
    body: formData.get('body'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const { result } = await logEmail(parsed.data);
    revalidatePath(`/outreach/${parsed.data.campaignContactId}`);
    return { ok: true, message: result.message };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const whatsappSchema = z.object({
  campaignContactId: z.string().min(1),
  messageType: z.nativeEnum(WhatsAppMessageType),
  messageText: z.string().trim().min(10, 'The message is too short.'),
});

export async function logWhatsAppAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireApiCapability('outreach:perform');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = whatsappSchema.safeParse({
    campaignContactId: formData.get('campaignContactId'),
    messageType: formData.get('messageType'),
    messageText: formData.get('messageText'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const { result } = await logWhatsApp(parsed.data);
    revalidatePath(`/outreach/${parsed.data.campaignContactId}`);
    return { ok: true, message: result.message };
  } catch (error) {
    // The service refuses without permission even if the UI is bypassed.
    return { error: (error as Error).message };
  }
}

/** Bulk assignment of campaign contacts to a caller. */
export async function bulkAssignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireApiCapability('contact:edit');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const ids = formData.getAll('ids').map(String).filter(Boolean);
  const assignedToId = String(formData.get('assignedToId') || '');
  if (ids.length === 0) return { error: 'Select at least one contact.' };

  const result = await prisma.campaignContact.updateMany({
    where: { id: { in: ids } },
    data: {
      assignedToId: assignedToId || null,
      currentStatus: assignedToId ? OutreachStatus.ASSIGNED : undefined,
    },
  });

  revalidatePath('/contacts');
  revalidatePath('/outreach');
  return { ok: true, message: `${result.count} contacts reassigned.` };
}

/** Bulk status change. The UI requires an explicit confirmation first. */
export async function bulkStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireApiCapability('contact:edit');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const ids = formData.getAll('ids').map(String).filter(Boolean);
  const status = formData.get('currentStatus');
  const confirmed = formData.get('confirm') === 'yes';
  if (ids.length === 0) return { error: 'Select at least one contact.' };
  if (!confirmed) return { error: 'Confirm the bulk update before applying it.' };

  const parsed = z.nativeEnum(OutreachStatus).safeParse(status);
  if (!parsed.success) return { error: 'Choose a valid status.' };

  const result = await prisma.campaignContact.updateMany({
    where: { id: { in: ids } },
    data: { currentStatus: parsed.data },
  });

  revalidatePath('/contacts');
  revalidatePath('/outreach');
  return { ok: true, message: `${result.count} contacts moved to ${parsed.data.replace(/_/g, ' ').toLowerCase()}.` };
}

/** Sets the next follow-up date from the outreach workspace. */
export async function setFollowUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireApiCapability('outreach:perform');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const id = String(formData.get('campaignContactId'));
  const date = String(formData.get('nextFollowUpAt') || '');
  await prisma.campaignContact.update({
    where: { id },
    data: { nextFollowUpAt: date ? new Date(date) : null },
  });

  revalidatePath(`/outreach/${id}`);
  return { ok: true, message: date ? 'Follow-up scheduled.' : 'Follow-up cleared.' };
}
