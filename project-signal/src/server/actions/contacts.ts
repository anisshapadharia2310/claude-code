'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission } from '../auth/guards';
import { getRepository } from '../repo';
import { rescoreCampaign } from '../services/scoring';
import { fieldErrorsFrom, type ActionState } from './types';

const idsSchema = z.object({
  ids: z.string().min(1, 'Select at least one contact.'),
  campaignId: z.string().min(1),
});

function parseIds(value: string): string[] {
  return value.split(',').map((id) => id.trim()).filter(Boolean);
}

const assignSchema = idsSchema.extend({
  assignedTo: z.string().min(1, 'Choose a caller.'),
});

export async function bulkAssignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertPermission('bulkUpdate');
    const parsed = assignSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const ids = parseIds(parsed.data.ids);
    const repo = await getRepository();
    const count = await repo.updateManyCampaignContacts(ids, {
      assignedUser: { connect: { id: parsed.data.assignedTo } },
      currentStatus: 'ASSIGNED',
    });

    revalidatePath('/contacts');
    revalidatePath('/outreach');
    return { ok: true, message: `Assigned ${count} contact${count === 1 ? '' : 's'}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not assign the contacts.' };
  }
}

const statusSchema = idsSchema.extend({
  currentStatus: z.enum([
    'NEW', 'ASSIGNED', 'ATTEMPTED', 'CONTACTED', 'ENGAGED', 'REGISTERED',
    'ATTENDED', 'MEETING_SET', 'NURTURE', 'CLOSED_LOST', 'DO_NOT_CONTACT',
  ]),
  confirm: z.string().refine((value) => value === 'yes', 'Confirm the bulk change before applying it.'),
});

export async function bulkStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertPermission('bulkUpdate');
    const parsed = statusSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const ids = parseIds(parsed.data.ids);
    const repo = await getRepository();
    const count = await repo.updateManyCampaignContacts(ids, { currentStatus: parsed.data.currentStatus });

    // A bulk do-not-contact must reach the contact record, not just the campaign row.
    if (parsed.data.currentStatus === 'DO_NOT_CONTACT') {
      for (const id of ids) {
        const link = await repo.getCampaignContact(id);
        if (!link) continue;
        await repo.updateContact(link.contactId, { consentStatus: 'DO_NOT_CONTACT' });
        await repo.upsertComplianceRecord(link.contactId, {
          country: link.contact.country,
          consentStatus: 'DO_NOT_CONTACT',
          optOutStatus: 'GLOBAL_OPT_OUT',
          lawfulBasis: 'NOT_DETERMINED',
          noticeProvided: link.contact.complianceRecords[0]?.noticeProvided ?? false,
          allowedChannels: [],
          blockedChannels: ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'LINKEDIN', 'POST'],
          complianceNotes: 'Do-not-contact applied by bulk status update.',
        });
      }
      await rescoreCampaign(repo, parsed.data.campaignId, {
        reason: 'COMPLIANCE_CHANGE',
        detail: 'Bulk do-not-contact applied.',
      });
    }

    revalidatePath('/contacts');
    revalidatePath('/outreach');
    return { ok: true, message: `Updated ${count} contact${count === 1 ? '' : 's'}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update the contacts.' };
  }
}

export async function rescoreCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('rescore');
    const campaignId = String(formData.get('campaignId') ?? '');
    if (!campaignId) return { error: 'No campaign selected.' };

    const repo = await getRepository();
    const summary = await rescoreCampaign(repo, campaignId, {
      actorId: user.id,
      reason: 'RESCORE',
      detail: 'Manual rescore.',
    });

    revalidatePath('/', 'layout');
    return {
      ok: true,
      message: `Rescored ${summary.scored} contacts. ${summary.changed} changed.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not rescore the campaign.' };
  }
}
