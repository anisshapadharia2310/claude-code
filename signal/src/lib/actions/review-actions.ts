'use server';
import { revalidatePath } from 'next/cache';
import { DataConfidence, HumanReviewStatus, Priority, RoleCategory, ScoreChangeSource, TriggerVerification } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rescoreCampaignContact } from '@/lib/services/scoring-service';
import type { ActionState } from './campaign-actions';

const reviewSchema = z.object({
  campaignContactId: z.string().min(1),
  decision: z.enum(['APPROVE', 'DOWNGRADE', 'REJECT']),
  whyThisContact: z.string().trim().optional(),
  reviewNotes: z.string().trim().optional(),
  roleCategory: z.nativeEnum(RoleCategory).optional(),
  roleConfidence: z.nativeEnum(DataConfidence).optional(),
  directProblemResponsibility: z.coerce.boolean().optional(),
  ownsBudget: z.coerce.boolean().optional(),
  influencesDecision: z.coerce.boolean().optional(),
  triggerVerification: z.nativeEnum(TriggerVerification).optional(),
  markVerifiedNow: z.coerce.boolean().optional(),
});

/**
 * Records a researcher's decision. Approving a contact for P1 requires the
 * written "why this contact" justification - the engine refuses to promote
 * without it, and so does this action.
 */
export async function submitReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireApiCapability('review:perform');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = reviewSchema.safeParse({
    campaignContactId: formData.get('campaignContactId'),
    decision: formData.get('decision'),
    whyThisContact: formData.get('whyThisContact') ?? undefined,
    reviewNotes: formData.get('reviewNotes') ?? undefined,
    roleCategory: formData.get('roleCategory') || undefined,
    roleConfidence: formData.get('roleConfidence') || undefined,
    directProblemResponsibility: formData.get('directProblemResponsibility') === 'on',
    ownsBudget: formData.get('ownsBudget') === 'on',
    influencesDecision: formData.get('influencesDecision') === 'on',
    triggerVerification: formData.get('triggerVerification') || undefined,
    markVerifiedNow: formData.get('markVerifiedNow') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;

  const record = await prisma.campaignContact.findUnique({
    where: { id: input.campaignContactId },
    include: { contact: { select: { id: true, accountId: true } } },
  });
  if (!record) return { error: 'That review item no longer exists.' };

  if (input.decision === 'APPROVE' && !input.whyThisContact) {
    return {
      error:
        'A written "why this contact" justification is required before approving a contact for P1.',
    };
  }

  await prisma.$transaction(async (tx) => {
    // Role facts live on the contact, because they are true across campaigns.
    await tx.contact.update({
      where: { id: record.contact.id },
      data: {
        roleCategory: input.roleCategory ?? undefined,
        roleConfidence: input.roleConfidence ?? undefined,
        directProblemResponsibility: input.directProblemResponsibility ?? undefined,
        ownsBudget: input.ownsBudget ?? undefined,
        influencesDecision: input.influencesDecision ?? undefined,
        lastVerifiedAt: input.markVerifiedNow ? new Date() : undefined,
      },
    });

    if (input.triggerVerification) {
      await tx.account.update({
        where: { id: record.contact.accountId },
        data: { triggerVerification: input.triggerVerification },
      });
    }

    await tx.campaignContact.update({
      where: { id: input.campaignContactId },
      data: {
        whyThisContact: input.whyThisContact ?? undefined,
        reviewNotes: input.reviewNotes ?? undefined,
        reviewedById: user.id,
        reviewedAt: new Date(),
        humanReviewStatus:
          input.decision === 'APPROVE'
            ? HumanReviewStatus.APPROVED
            : input.decision === 'DOWNGRADE'
              ? HumanReviewStatus.DOWNGRADED
              : HumanReviewStatus.REJECTED,
        humanReviewRequired: false,
        // A rejection is a human override of the engine and is recorded as such.
        priority: input.decision === 'REJECT' ? Priority.REJECT : undefined,
        currentStatus: input.decision === 'REJECT' ? 'REJECTED' : undefined,
      },
    });
  });

  // Rejections stand as a human decision; other outcomes are re-scored so the
  // new role facts are reflected everywhere.
  if (input.decision !== 'REJECT') {
    await rescoreCampaignContact(input.campaignContactId, {
      source: ScoreChangeSource.HUMAN_REVIEW,
      reason: `Research review: ${input.decision.toLowerCase()}.`,
      changedById: user.id,
    });
  } else {
    await prisma.scoreAudit.create({
      data: {
        campaignContactId: input.campaignContactId,
        source: ScoreChangeSource.HUMAN_REVIEW,
        reason: `Rejected by researcher: ${input.reviewNotes ?? 'no reason given'}.`,
        previousTotal: record.totalScore,
        newTotal: record.totalScore,
        previousPriority: record.priority,
        newPriority: Priority.REJECT,
        changedById: user.id,
      },
    });
  }

  revalidatePath('/review');
  revalidatePath('/contacts');
  revalidatePath(`/contacts/${record.contact.id}`);
  return { ok: true, message: `Review recorded (${input.decision.toLowerCase()}).` };
}
