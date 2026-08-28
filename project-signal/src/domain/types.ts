/**
 * Domain types.
 *
 * The domain layer is deliberately free of Next.js, React and the Prisma
 * runtime. It imports Prisma's *types* only (erased at compile time) so the
 * shapes never drift from the database, but nothing here executes a query.
 */
import type {
  Account,
  Campaign,
  CampaignContact,
  Channel,
  ComplianceRecord,
  Contact,
  CountryComplianceRule,
  DataConfidence,
  DecisionRole,
  EmployeeBand,
  EngagementEvent,
  EventType,
  Priority,
  RevenueBand,
  RoleCategory,
  Seniority,
} from '@prisma/client';

export type {
  Account,
  Campaign,
  CampaignContact,
  Channel,
  ComplianceRecord,
  Contact,
  CountryComplianceRule,
  DataConfidence,
  DecisionRole,
  EmployeeBand,
  EngagementEvent,
  EventType,
  Priority,
  RevenueBand,
  RoleCategory,
  Seniority,
};

/** The six scoring bands defined by the SIGNAL model. */
export type ScoreBand = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  A: 'Company fit',
  B: 'Contact-role relevance',
  C: 'Current business trigger',
  D: 'Engagement and intent',
  E: 'Data quality and reachability',
  F: 'Attendance likelihood',
};

/**
 * One scoring component. Every point in the application traces back to one of
 * these, which is what makes "explain every score" possible.
 */
export interface ScoreAward {
  /** Stable identifier, e.g. "A_INDUSTRY". Used as the weight key. */
  code: string;
  band: ScoreBand;
  label: string;
  /** Points actually awarded. */
  points: number;
  /** Points available for this component under the active weights. */
  maxPoints: number;
  awarded: boolean;
  /** Human-readable justification shown in the score tooltip. */
  evidence: string;
  /** Record fields the decision was derived from. */
  sourceFields: string[];
}

export interface BandResult {
  band: ScoreBand;
  label: string;
  score: number;
  max: number;
  awards: ScoreAward[];
}

export interface ScoreBreakdown {
  bands: BandResult[];
  baseScore: number;
  engagementBonus: number;
  engagementBonusDetail: EngagementBonusEntry[];
  /** min(100, baseScore + engagementBonus) */
  totalScore: number;
  cappedAt100: boolean;
  scoredAt: string;
}

export interface EngagementBonusEntry {
  eventType: EventType;
  label: string;
  points: number;
  occurredAt: string;
  /** Set when a signal was recognised but intentionally not added again. */
  suppressedReason?: string;
}

export type GateSeverity = 'BLOCKING' | 'REVIEW' | 'ADVISORY';

export interface GateCheck {
  code: string;
  label: string;
  passed: boolean;
  severity: GateSeverity;
  detail: string;
}

export interface RelevanceGateResult {
  /** False when at least one BLOCKING check failed. */
  passed: boolean;
  /** False when any BLOCKING or REVIEW check failed - P1 is then unavailable. */
  allowsP1: boolean;
  checks: GateCheck[];
  blockingFailures: string[];
  reviewFailures: string[];
  advisories: string[];
}

export type ComplianceStatus = 'PASS' | 'HOLD' | 'BLOCKED';

export interface BlockedChannel {
  channel: Channel;
  reason: string;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  /** Channels that may actually be used right now. */
  allowedChannels: Channel[];
  blockedChannels: BlockedChannel[];
  /** Compliance fields that are missing and cause a HOLD. */
  missingFields: string[];
  warnings: string[];
  /** True when the contact must never be contacted again on any channel. */
  doNotContact: boolean;
  summary: string;
}

export interface ScoringWeights {
  bandMax: Record<ScoreBand, number>;
  componentMax: Record<string, number>;
  thresholds: {
    p1: number;
    p2: number;
    p3: number;
    p1MinRoleRelevance: number;
    p1MinDataQuality: number;
  };
}

export interface WeightValidationIssue {
  path: string;
  message: string;
}

export interface WeightValidationResult {
  valid: boolean;
  issues: WeightValidationIssue[];
  total: number;
}

export interface PriorityDecision {
  priority: Priority;
  /** Ordered list of the rules that produced this priority. */
  reasons: string[];
  humanReviewRequired: boolean;
  humanReviewReasons: string[];
}

export interface AccountSignal {
  accountId: string;
  companyName: string;
  contactsInCampaign: number;
  registered: number;
  attended: number;
  engaged: number;
  meetingsRequested: number;
  /** 1.0 = no additional account signal. Displayed, never folded into a score. */
  multiplier: number;
  tier: 'NONE' | 'EMERGING' | 'ACTIVE' | 'STRONG';
  message: string | null;
}
