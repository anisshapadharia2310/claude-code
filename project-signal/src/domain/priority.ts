/**
 * Priority assignment.
 *
 * Ordering matters: the gates are absolute and are evaluated before any
 * threshold. A high score never rescues a contact who failed a gate.
 */
import type { RelevanceGateOutput } from './relevance-gate';
import type { ScoreResult } from './scoring';
import type {
  Account,
  ComplianceResult,
  Contact,
  Priority,
  PriorityDecision,
  ScoringWeights,
} from './types';

export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: 'P1 - Highest priority',
  P2: 'P2 - Medium priority',
  P3: 'P3 - Low priority / nurture',
  REJECT: 'Reject',
  COMPLIANCE_HOLD: 'Compliance hold',
  UNSCORED: 'Not yet scored',
};

export const PRIORITY_SHORT_LABELS: Record<Priority, string> = {
  P1: 'P1', P2: 'P2', P3: 'P3', REJECT: 'Reject', COMPLIANCE_HOLD: 'Hold', UNSCORED: 'Unscored',
};

/** How close to the P1 threshold a contact must be to enter the review queue. */
export const NEAR_P1_MARGIN = 8;

export interface PriorityInput {
  score: ScoreResult;
  gate: RelevanceGateOutput;
  compliance: ComplianceResult;
  weights: ScoringWeights;
  contact: Contact;
  account: Account;
  /** The mandatory P1 justification, when one has been written. */
  whyThisContact?: string | null;
  /** Current review state, so an approved P1 stops asking for approval. */
  humanReviewApproved?: boolean;
}

export function decidePriority(input: PriorityInput): PriorityDecision {
  const { score, gate, compliance, weights, contact, account } = input;
  const { p1, p2, p3, p1MinRoleRelevance, p1MinDataQuality } = weights.thresholds;
  const reasons: string[] = [];
  const reviewReasons: string[] = [];

  // --- absolute rejections -------------------------------------------------
  if (compliance.doNotContact) {
    return {
      priority: 'REJECT',
      reasons: ['Contact is marked do-not-contact. Outreach is blocked on every channel.'],
      humanReviewRequired: false,
      humanReviewReasons: [],
    };
  }

  if (contact.isDuplicate) {
    return {
      priority: 'REJECT',
      reasons: [`Duplicate of contact ${contact.duplicateOfId ?? 'unknown'}.`],
      humanReviewRequired: false,
      humanReviewReasons: [],
    };
  }

  if (!gate.passed) {
    return {
      priority: 'REJECT',
      reasons: ['Failed the relevance gate.', ...gate.blockingFailures],
      humanReviewRequired: gate.relevance.keywordTrap,
      humanReviewReasons: gate.relevance.keywordTrap
        ? ['Title contained a campaign keyword but failed the ownership test. Confirm before discarding.']
        : [],
    };
  }

  if (compliance.status === 'BLOCKED') {
    return {
      priority: 'REJECT',
      reasons: ['Compliance gate failed.', compliance.summary],
      humanReviewRequired: false,
      humanReviewReasons: [],
    };
  }

  // --- compliance hold -----------------------------------------------------
  if (compliance.status === 'HOLD') {
    return {
      priority: 'COMPLIANCE_HOLD',
      reasons: [
        'Compliance information is incomplete, so outreach is held.',
        `Missing: ${compliance.missingFields.join(', ')}.`,
      ],
      humanReviewRequired: true,
      humanReviewReasons: [`Complete the compliance record: ${compliance.missingFields.join(', ')}.`],
    };
  }

  // --- review flags (do not change the priority band on their own) ---------
  for (const failure of gate.reviewFailures) reviewReasons.push(failure);

  if (contact.roleCategory === 'UNKNOWN') {
    reviewReasons.push('Role category is UNKNOWN. A researcher must classify this contact.');
  }
  if (account.triggerVerification === 'UNVERIFIED' && score.triggerScore > 0) {
    reviewReasons.push('Business trigger points were awarded from an unverified trigger. Verify or mark it false.');
  }
  if (gate.relevance.keywordTrap) {
    reviewReasons.push('Title matched a campaign keyword but failed the ownership test.');
  }

  // --- thresholds ----------------------------------------------------------
  const meetsP1Score = score.totalScore >= p1;
  const meetsP1Role = score.roleRelevanceScore >= p1MinRoleRelevance;
  const meetsP1Data = score.dataQualityScore >= p1MinDataQuality;

  if (meetsP1Score && meetsP1Role && meetsP1Data && gate.allowsP1) {
    reasons.push(`Total score ${score.totalScore} meets the P1 threshold of ${p1}.`);
    reasons.push(`Role relevance ${score.roleRelevanceScore}/${weights.bandMax.B} meets the P1 minimum of ${p1MinRoleRelevance}, which requires confirmed problem ownership.`);
    reasons.push(`Data quality ${score.dataQualityScore}/${weights.bandMax.E} meets the P1 minimum of ${p1MinDataQuality}.`);
    reasons.push('Relevance and compliance gates both passed.');

    const hasJustification = Boolean(input.whyThisContact && input.whyThisContact.trim().length >= 20);
    if (!hasJustification) {
      reviewReasons.push('P1 requires a written "why this contact" justification before approval.');
    }
    if (!input.humanReviewApproved) {
      reviewReasons.push('P1 requires manager approval before it can be exported or worked as a P1.');
    }

    return {
      priority: 'P1',
      reasons,
      humanReviewRequired: reviewReasons.length > 0,
      humanReviewReasons: reviewReasons,
    };
  }

  // Explain precisely why a high scorer is not a P1.
  if (meetsP1Score && !meetsP1Role) {
    reasons.push(`Total score ${score.totalScore} would qualify for P1, but role relevance is only ${score.roleRelevanceScore}/${weights.bandMax.B} against a minimum of ${p1MinRoleRelevance}. Problem ownership is not established.`);
    reviewReasons.push('Scores at the P1 level on everything except role ownership. Confirm or correct the role classification.');
  } else if (meetsP1Score && !meetsP1Data) {
    reasons.push(`Total score ${score.totalScore} would qualify for P1, but data quality is only ${score.dataQualityScore}/${weights.bandMax.E} against a minimum of ${p1MinDataQuality}.`);
    reviewReasons.push('Scores at the P1 level but the record is not verified enough. Re-verify the contact details.');
  } else if (meetsP1Score && !gate.allowsP1) {
    reasons.push(`Total score ${score.totalScore} would qualify for P1, but review-level gate checks are unresolved.`);
  } else if (score.totalScore >= p1 - NEAR_P1_MARGIN && score.totalScore < p1) {
    reviewReasons.push(`Within ${NEAR_P1_MARGIN} points of the P1 threshold. A verified trigger or a confirmed role could promote this contact.`);
  }

  if (score.totalScore >= p2) {
    reasons.push(`Total score ${score.totalScore} is in the P2 range (${p2}-${p1 - 1}) and all gates pass.`);
    return { priority: 'P2', reasons, humanReviewRequired: reviewReasons.length > 0, humanReviewReasons: reviewReasons };
  }

  if (score.totalScore >= p3) {
    reasons.push(`Total score ${score.totalScore} is in the P3 nurture range (${p3}-${p2 - 1}) and all gates pass.`);
    return { priority: 'P3', reasons, humanReviewRequired: reviewReasons.length > 0, humanReviewReasons: reviewReasons };
  }

  reasons.push(`Total score ${score.totalScore} is below the minimum working threshold of ${p3}.`);
  return { priority: 'REJECT', reasons, humanReviewRequired: false, humanReviewReasons: reviewReasons };
}
