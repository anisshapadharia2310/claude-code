'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission } from '../auth/guards';
import { getRepository } from '../repo';
import { logCall, logEmail, logWhatsApp } from '../services/outreach';
import { fieldErrorsFrom, type ActionState } from './types';

const callSchema = z.object({
  campaignContactId: z.string().min(1),
  outcome: z.enum([
    'CONNECTED', 'NO_ANSWER', 'BUSY', 'CALLBACK_REQUESTED', 'INTERESTED',
    'SENT_WHITEPAPER', 'SENT_WEBINAR_LINK', 'REGISTERED', 'NOT_RELEVANT',
    'NOT_INTERESTED', 'WRONG_NUMBER', 'DO_NOT_CONTACT',
  ]),
  notes: z.string().max(2000).optional(),
  nextAction: z.string().max(500).optional(),
  nextFollowUpAt: z.string().optional(),
  durationSeconds: z.coerce.number().int().min(0).max(36_000).optional(),
});

export async function logCallAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('logOutreach');
    const parsed = callSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const repo = await getRepository();
    await logCall(repo, {
      campaignContactId: parsed.data.campaignContactId,
      callerId: user.id,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes || null,
      nextAction: parsed.data.nextAction || null,
      nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
      durationSeconds: parsed.data.durationSeconds ?? null,
    });

    revalidatePath('/outreach');
    revalidatePath(`/outreach/${parsed.data.campaignContactId}`);
    revalidatePath('/');
    return { ok: true, message: `Outcome recorded: ${parsed.data.outcome.replace(/_/g, ' ').toLowerCase()}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not record the outcome.' };
  }
}

const emailSchema = z.object({
  campaignContactId: z.string().min(1),
  emailType: z.enum([
    'WHITEPAPER_OFFER', 'WEBINAR_INVITATION', 'WEBINAR_REMINDER', 'FOLLOW_UP',
    'REPLAY_SHARE', 'NURTURE', 'MEETING_REQUEST',
  ]),
  subject: z.string().trim().min(3, 'Write a subject line.').max(200),
  body: z.string().trim().min(20, 'The body is too short to be useful.').max(20_000),
  markSent: z.string().optional(),
  replySentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'OUT_OF_OFFICE', 'UNSUBSCRIBE', 'REFERRAL']).optional(),
});

export async function logEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('logOutreach');
    const parsed = emailSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const repo = await getRepository();
    const result = await logEmail(repo, {
      campaignContactId: parsed.data.campaignContactId,
      actorId: user.id,
      emailType: parsed.data.emailType,
      subject: parsed.data.subject,
      body: parsed.data.body,
      markSent: parsed.data.markSent === 'on' || parsed.data.markSent === 'true',
      replySentiment: parsed.data.replySentiment ?? null,
    });

    revalidatePath(`/email/${parsed.data.campaignContactId}`);
    revalidatePath(`/outreach/${parsed.data.campaignContactId}`);
    return { ok: true, message: result.message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not record the email.' };
  }
}

const whatsappSchema = z.object({
  campaignContactId: z.string().min(1),
  messageType: z.enum([
    'WEBINAR_INVITATION', 'WEBINAR_REMINDER', 'WHITEPAPER_SHARE', 'FOLLOW_UP', 'MEETING_CONFIRMATION',
  ]),
  messageText: z.string().trim().min(10, 'The message is too short.').max(4000),
  markSent: z.string().optional(),
});

export async function logWhatsAppAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('logOutreach');
    const parsed = whatsappSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const repo = await getRepository();
    const result = await logWhatsApp(repo, {
      campaignContactId: parsed.data.campaignContactId,
      actorId: user.id,
      messageType: parsed.data.messageType,
      messageText: parsed.data.messageText,
      markSent: parsed.data.markSent === 'on' || parsed.data.markSent === 'true',
    });

    revalidatePath(`/whatsapp/${parsed.data.campaignContactId}`);
    return { ok: true, message: result.message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not record the message.' };
  }
}
