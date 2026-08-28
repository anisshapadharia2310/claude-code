/**
 * The full qualification pipeline for one contact on one campaign.
 *
 * Pure: give it facts, get back a decision plus the complete reasoning. The
 * service layer calls this and then persists the result; tests call it directly.
 *
 * Order is fixed and meaningful:
 *   compliance -> relevance gate -> score -> priority -> recommendations
 */
import { buildRecommendations, type Recommendations } from './recommendations';
import { computeScore, type ScoreResult } from './scoring';
import { decidePriority } from './priority';
import { evaluateCompliance } from './compliance';
import { runRelevanceGate, type RelevanceGateOutput } from './relevance-gate';
import { DEFAULT_WEIGHTS } from './weights';
import type {
  Account,
  AccountSignal,
  Campaign,
  ComplianceRecord,
  ComplianceResult,
  Contact,
  CountryComplianceRule,
  EngagementEvent,
  PriorityDecision,
  ScoringWeights,
} from './types';

export interface QualifyInput {
  account: Account;
  contact: Contact;
  campaign: Campaign;
  events?: EngagementEvent[];
  historicalEvents?: EngagementEvent[];
  complianceRecord?: ComplianceRecord | null;
  countryRule?: CountryComplianceRule | null;
  weights?: ScoringWeights;
  /** Existing justification, so an approved P1 is not re-flagged. */
  whyThisContact?: string | null;
  humanReviewApproved?: boolean;
  accountSignal?: AccountSignal | null;
  now?: Date;
}

export interface QualifyResult {
  compliance: ComplianceResult;
  gate: RelevanceGateOutput;
  score: ScoreResult;
  decision: PriorityDecision;
  recommendations: Recommendations;
  accountSignal: AccountSignal | null;
}

export function qualifyContact(input: QualifyInput): QualifyResult {
  const now = input.now ?? new Date();
  const weights = input.weights ?? DEFAULT_WEIGHTS;
  const events = input.events ?? [];

  const compliance = evaluateCompliance({
    contact: input.contact,
    record: input.complianceRecord ?? null,
    rule: input.countryRule ?? null,
    campaignChannels: input.campaign.allowedChannels,
    now,
  });

  const gate = runRelevanceGate({
    account: input.account,
    contact: input.contact,
    campaign: input.campaign,
    compliance,
    now,
  });

  const score = computeScore({
    account: input.account,
    contact: input.contact,
    campaign: input.campaign,
    events,
    historicalEvents: input.historicalEvents ?? [],
    compliance,
    gate,
    weights,
    now,
  });

  const decision = decidePriority({
    score,
    gate,
    compliance,
    weights,
    contact: input.contact,
    account: input.account,
    whyThisContact: input.whyThisContact ?? null,
    humanReviewApproved: input.humanReviewApproved ?? false,
  });

  const recommendations = buildRecommendations({
    account: input.account,
    contact: input.contact,
    campaign: input.campaign,
    priority: decision.priority,
    score,
    relevance: gate.relevance,
    compliance,
    accountSignalMessage: input.accountSignal?.message ?? null,
  });

  return {
    compliance,
    gate,
    score,
    decision,
    recommendations,
    accountSignal: input.accountSignal ?? null,
  };
}
