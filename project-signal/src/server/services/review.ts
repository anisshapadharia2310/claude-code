/**
 * Research review queue.
 *
 * A contact enters the queue when the engine is not confident enough to decide
 * alone. Each entry carries the specific reasons, so a researcher knows what to
 * check rather than re-reading the whole record.
 */
import type { DataConfidence, Prisma, RoleCategory, TriggerVerification } from '@prisma/client';
import { NEAR_P1_MARGIN } from '@/domain/priority';
import type { CampaignContactFull, SignalRepository } from '../repo/types';
import { rescoreCampaign } from './scoring';

export type ReviewReasonCode =
  | 'UNKNOWN_ROLE' | 'LOW_ROLE_CONFIDENCE' | 'NEAR_P1' | 'UNVERIFIED_TRIGGER'
  | 'CONFLICTING_DATA' | 'STALE_DATA' | 'KEYWORD_TRAP' | 'AWAITING_P1_APPROVAL'
  | 'MISSING_JUSTIFICATION' | 'COMPLIANCE_INCOMPLETE';

export interface ReviewReason {
  code: ReviewReasonCode;
  label: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ReviewQueueEntry {
  row: CampaignContactFull;
  reasons: ReviewReason[];
  /** Highest severity present, used for queue ordering. */
  rank: number;
}

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Decide whether a row belongs in the queue, and why. */
export function reviewReasonsFor(row: CampaignContactFull, p1Threshold = 80): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  const contact = row.contact;
  const account = contact.account;

  if (row.priority === 'P1' && row.humanReviewStatus !== 'APPROVED') {
    reasons.push({
      code: 'AWAITING_P1_APPROVAL',
      label: 'P1 awaiting approval',
      detail: 'Scored P1 by the engine. A manager must approve it before it can be worked or exported as a P1.',
      severity: 'high',
    });
  }

  if (row.priority === 'P1' && (!row.whyThisContact || row.whyThisContact.trim().length < 20)) {
    reasons.push({
      code: 'MISSING_JUSTIFICATION',
      label: 'No "why this contact" note',
      detail: 'A P1 requires a written justification. The engine draft is a starting point, not the note.',
      severity: 'high',
    });
  }

  if (contact.roleCategory === 'UNKNOWN') {
    reasons.push({
      code: 'UNKNOWN_ROLE',
      label: 'Unknown role category',
      detail: `No business function could be established from "${contact.jobTitle}".`,
      severity: 'high',
    });
  } else if (contact.roleConfidence === 'LOW' || contact.roleConfidence === 'UNKNOWN') {
    reasons.push({
      code: 'LOW_ROLE_CONFIDENCE',
      label: 'Low role confidence',
      detail: contact.roleRelevanceNotes ?? 'Role classification needs a human check.',
      severity: 'high',
    });
  }

  if (row.priority !== 'P1' && row.totalScore >= p1Threshold - NEAR_P1_MARGIN && row.totalScore < p1Threshold) {
    reasons.push({
      code: 'NEAR_P1',
      label: `Within ${NEAR_P1_MARGIN} points of P1`,
      detail: `Scores ${row.totalScore}. A verified trigger or a confirmed role could promote this contact.`,
      severity: 'medium',
    });
  }

  if (account.triggerVerification === 'UNVERIFIED' && row.triggerScore > 0) {
    reasons.push({
      code: 'UNVERIFIED_TRIGGER',
      label: 'Unverified business trigger',
      detail: account.recentBusinessTrigger
        ? `"${account.recentBusinessTrigger}" has no source on record.`
        : 'Trigger points were awarded from an unverified signal.',
      severity: 'medium',
    });
  }

  // Conflicting data: the contact's country disagrees with the account's, or
  // the email domain disagrees with the company domain.
  const emailDomain = contact.workEmail?.split('@')[1]?.toLowerCase() ?? null;
  if (contact.country !== account.country) {
    reasons.push({
      code: 'CONFLICTING_DATA',
      label: 'Conflicting location data',
      detail: `Contact country (${contact.country}) does not match the account country (${account.country}).`,
      severity: 'medium',
    });
  } else if (emailDomain && account.domain && emailDomain !== account.domain.toLowerCase()) {
    reasons.push({
      code: 'CONFLICTING_DATA',
      label: 'Email domain does not match the company',
      detail: `Email domain "${emailDomain}" differs from the account domain "${account.domain}".`,
      severity: 'medium',
    });
  }

  if (!contact.lastVerifiedAt) {
    reasons.push({
      code: 'STALE_DATA',
      label: 'Never verified',
      detail: 'No last-verified date on record.',
      severity: 'medium',
    });
  }

  if (row.priority === 'COMPLIANCE_HOLD') {
    reasons.push({
      code: 'COMPLIANCE_INCOMPLETE',
      label: 'Compliance record incomplete',
      detail: row.humanReviewReasons[0] ?? 'Required compliance information is missing.',
      severity: 'high',
    });
  }

  const keywordTrap = row.gateFailureReasons.some((reason) => reason.includes('keyword'))
    || row.gateWarnings.some((reason) => reason.toLowerCase().includes('keyword'));
  if (keywordTrap) {
    reasons.push({
      code: 'KEYWORD_TRAP',
      label: 'Title keyword did not survive the ownership test',
      detail: 'The title looked relevant but the ownership test failed. Confirm before discarding.',
      severity: 'low',
    });
  }

  return reasons;
}

export function buildReviewQueue(rows: CampaignContactFull[], p1Threshold = 80): ReviewQueueEntry[] {
  return rows
    .map((row) => {
      const reasons = reviewReasonsFor(row, p1Threshold);
      return {
        row,
        reasons,
        rank: reasons.length === 0 ? 99 : Math.min(...reasons.map((reason) => SEVERITY_RANK[reason.severity])),
      };
    })
    .filter((entry) => entry.reasons.length > 0)
    .filter((entry) => entry.row.humanReviewStatus !== 'REJECTED')
    .sort((a, b) => a.rank - b.rank || b.row.totalScore - a.row.totalScore);
}

export type ReviewDecision = 'APPROVE' | 'DOWNGRADE' | 'REJECT' | 'SAVE';

export interface ApplyReviewInput {
  campaignContactId: string;
  reviewerId: string;
  decision: ReviewDecision;
  reviewNotes?: string | null;
  whyThisContact?: string | null;
  /** Researcher corrections to the underlying contact record. */
  roleCategory?: RoleCategory | null;
  roleConfidence?: DataConfidence | null;
  directProblemResponsibility?: boolean | null;
  ownsBudget?: boolean | null;
  influencesDecision?: boolean | null;
  roleRelevanceNotes?: string | null;
  markVerifiedNow?: boolean;
  triggerVerification?: TriggerVerification | null;
}

/**
 * Apply a review decision.
 * Contact-level corrections are written first, then the campaign row, then the
 * campaign is rescored so the correction is reflected everywhere immediately.
 */
export async function applyReview(repo: SignalRepository, input: ApplyReviewInput): Promise<void> {
  const link = await repo.getCampaignContact(input.campaignContactId);
  if (!link) throw new Error('Contact not found on this campaign.');
  const now = new Date();

  const contactUpdate: Prisma.ContactUpdateInput = {};
  if (input.roleCategory) contactUpdate.roleCategory = input.roleCategory;
  if (input.roleConfidence) contactUpdate.roleConfidence = input.roleConfidence;
  if (input.directProblemResponsibility !== null && input.directProblemResponsibility !== undefined) {
    contactUpdate.directProblemResponsibility = input.directProblemResponsibility;
  }
  if (input.ownsBudget !== null && input.ownsBudget !== undefined) contactUpdate.ownsBudget = input.ownsBudget;
  if (input.influencesDecision !== null && input.influencesDecision !== undefined) {
    contactUpdate.influencesDecision = input.influencesDecision;
  }
  if (input.roleRelevanceNotes) contactUpdate.roleRelevanceNotes = input.roleRelevanceNotes;
  if (input.markVerifiedNow) contactUpdate.lastVerifiedAt = now;
  if (Object.keys(contactUpdate).length > 0) {
    await repo.updateContact(link.contactId, contactUpdate);
  }

  if (input.triggerVerification) {
    await repo.updateAccount(link.contact.accountId, { triggerVerification: input.triggerVerification });
  }

  const humanReviewStatus =
    input.decision === 'APPROVE' ? 'APPROVED'
    : input.decision === 'DOWNGRADE' ? 'DOWNGRADED'
    : input.decision === 'REJECT' ? 'REJECTED'
    : 'IN_REVIEW';

  await repo.updateCampaignContact(link.id, {
    humanReviewStatus,
    humanReviewRequired: input.decision === 'SAVE',
    reviewNotes: input.reviewNotes ?? link.reviewNotes,
    whyThisContact: input.whyThisContact ?? link.whyThisContact,
    reviewedBy: { connect: { id: input.reviewerId } },
    reviewedAt: now,
    ...(input.decision === 'REJECT' ? { priority: 'REJECT' as const, currentStatus: 'CLOSED_LOST' as const } : {}),
    ...(input.decision === 'DOWNGRADE' && link.priority === 'P1' ? { priority: 'P2' as const } : {}),
  });

  await rescoreCampaign(repo, link.campaignId, {
    actorId: input.reviewerId,
    reason: 'MANUAL_REVIEW',
    detail: `Review decision: ${input.decision}.`,
  });

  // A rejection or downgrade must survive the rescore, which is otherwise free
  // to promote the contact again on the same evidence.
  if (input.decision === 'REJECT') {
    await repo.updateCampaignContact(link.id, { priority: 'REJECT', humanReviewStatus: 'REJECTED', humanReviewRequired: false });
  }
  if (input.decision === 'DOWNGRADE') {
    const after = await repo.getCampaignContact(link.id);
    if (after && after.priority === 'P1') {
      await repo.updateCampaignContact(link.id, { priority: 'P2', humanReviewStatus: 'DOWNGRADED', humanReviewRequired: false });
    }
  }
}
