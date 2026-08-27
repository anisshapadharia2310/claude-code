'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission } from '../auth/guards';
import { getRepository } from '../repo';
import { applyReview } from '../services/review';
import { fieldErrorsFrom, type ActionState } from './types';

const optionalBool = z.enum(['true', 'false', '']).optional();
const toBool = (value: string | undefined): boolean | null =>
  value === 'true' ? true : value === 'false' ? false : null;

const reviewSchema = z.object({
  campaignContactId: z.string().min(1),
  decision: z.enum(['APPROVE', 'DOWNGRADE', 'REJECT', 'SAVE']),
  reviewNotes: z.string().max(4000).optional(),
  whyThisContact: z.string().max(4000).optional(),
  roleCategory: z.enum([
    'DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'TECHNICAL_EVALUATOR',
    'BUSINESS_INFLUENCER', 'PROCUREMENT', 'END_USER', 'PERIPHERAL', 'UNKNOWN',
  ]).optional(),
  roleConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']).optional(),
  directProblemResponsibility: optionalBool,
  ownsBudget: optionalBool,
  influencesDecision: optionalBool,
  roleRelevanceNotes: z.string().max(2000).optional(),
  markVerifiedNow: z.string().optional(),
  triggerVerification: z.enum(['VERIFIED', 'UNVERIFIED', 'FALSE_POSITIVE', 'NONE']).optional(),
});

export async function applyReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    // Approving a P1 is a manager decision; everything else a researcher can do.
    const user = parsed.data.decision === 'APPROVE'
      ? await assertPermission('approveP1')
      : await assertPermission('reviewContacts');

    if (parsed.data.decision === 'APPROVE') {
      const justification = (parsed.data.whyThisContact ?? '').trim();
      if (justification.length < 20) {
        return {
          error: 'A P1 cannot be approved without a written "why this contact" justification of at least 20 characters.',
          fieldErrors: { whyThisContact: 'Write the justification before approving.' },
        };
      }
    }

    const repo = await getRepository();
    await applyReview(repo, {
      campaignContactId: parsed.data.campaignContactId,
      reviewerId: user.id,
      decision: parsed.data.decision,
      reviewNotes: parsed.data.reviewNotes || null,
      whyThisContact: parsed.data.whyThisContact || null,
      roleCategory: parsed.data.roleCategory ?? null,
      roleConfidence: parsed.data.roleConfidence ?? null,
      directProblemResponsibility: toBool(parsed.data.directProblemResponsibility),
      ownsBudget: toBool(parsed.data.ownsBudget),
      influencesDecision: toBool(parsed.data.influencesDecision),
      roleRelevanceNotes: parsed.data.roleRelevanceNotes || null,
      markVerifiedNow: parsed.data.markVerifiedNow === 'on',
      triggerVerification: parsed.data.triggerVerification ?? null,
    });

    revalidatePath('/review');
    revalidatePath('/contacts');
    revalidatePath('/');
    const verb = {
      APPROVE: 'approved', DOWNGRADE: 'downgraded', REJECT: 'rejected', SAVE: 'saved',
    }[parsed.data.decision];
    return { ok: true, message: `Contact ${verb}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the review.' };
  }
}
