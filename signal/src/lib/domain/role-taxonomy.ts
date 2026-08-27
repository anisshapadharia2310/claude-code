import { DataConfidence, DecisionRole, RoleCategory, Seniority } from '@prisma/client';
import {
  AMBIGUOUS_TERMS,
  OPERATIONAL_DEPARTMENTS,
  PERIPHERAL_DEPARTMENTS,
  PROCUREMENT_DEPARTMENTS,
  TECHNICAL_DEPARTMENTS,
} from './constants';
import type { CampaignInput, ContactInput, RoleClassification } from './types';

/** Abbreviations expanded before any matching happens. */
const TITLE_EXPANSIONS: Array<[RegExp, string]> = [
  [/\bcx\b/g, 'customer experience'],
  [/\bcs\b/g, 'customer service'],
  [/\bcc\b/g, 'contact centre'],
  [/\bceo\b/g, 'chief executive officer'],
  [/\bcoo\b/g, 'chief operating officer'],
  [/\bcio\b/g, 'chief information officer'],
  [/\bcto\b/g, 'chief technology officer'],
  [/\bcfo\b/g, 'chief financial officer'],
  [/\bcdo\b/g, 'chief digital officer'],
  [/\bcco\b/g, 'chief customer officer'],
  [/\bcmo\b/g, 'chief marketing officer'],
  [/\bsvp\b/g, 'senior vice president'],
  [/\bevp\b/g, 'executive vice president'],
  [/\bavp\b/g, 'assistant vice president'],
  [/\bvp\b/g, 'vice president'],
  [/\bsr\.?\b/g, 'senior'],
  [/\bjr\.?\b/g, 'junior'],
  [/\bmgr\.?\b/g, 'manager'],
  [/\bdir\.?\b/g, 'director'],
  [/\bops\b/g, 'operations'],
  [/\bcust\b/g, 'customer'],
  [/\bhd\b/g, 'head'],
  [/\bgm\b/g, 'general manager'],
  [/\bit\b/g, 'information technology'],
  [/\bhr\b/g, 'human resources'],
  [/\bbpo\b/g, 'business process outsourcing'],
  [/\bem\b/g, 'engineering manager'],
];

/**
 * Lower-cases, strips decoration, drops everything after a separator (titles are
 * frequently "Head of CX | Speaker | Author") and expands common abbreviations.
 */
export function normalizeJobTitle(raw: string): string {
  if (!raw) return '';
  let title = raw.toLowerCase().trim();
  title = title.split(/[|•·]/)[0];
  title = title.replace(/\(.*?\)/g, ' ');
  title = title.replace(/[^a-z0-9&/\-\s]/g, ' ');
  title = title.replace(/[-/]/g, ' ');
  title = title.replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of TITLE_EXPANSIONS) {
    title = title.replace(pattern, replacement);
  }
  return title.replace(/\s+/g, ' ').trim();
}

const SENIORITY_PATTERNS: Array<[Seniority, RegExp]> = [
  // Lookbehind keeps "vice president" (and "senior vice president") out of C_LEVEL.
  [Seniority.C_LEVEL, /\bchief\b|\bc suite\b|(?<!vice )\bpresident\b|\bpartner\b|\bowner\b|\bfounder\b/],
  [Seniority.EVP, /\bexecutive vice president\b/],
  [Seniority.SVP, /\bsenior vice president\b/],
  [Seniority.VP, /\bvice president\b/],
  [Seniority.HEAD, /\bhead\b|\bglobal lead\b/],
  [Seniority.DIRECTOR, /\bdirector\b/],
  [Seniority.SENIOR_MANAGER, /\bsenior manager\b|\bgeneral manager\b|\bgroup manager\b/],
  [Seniority.MANAGER, /\bmanager\b|\bsupervisor\b/],
  [Seniority.TEAM_LEAD, /\bteam lead\b|\blead\b|\bteam leader\b/],
  [
    Seniority.INDIVIDUAL_CONTRIBUTOR,
    /\banalyst\b|\bspecialist\b|\bengineer\b|\bconsultant\b|\bagent\b|\badvisor\b|\bassociate\b|\bexecutive\b|\bcoordinator\b|\bofficer\b|\brepresentative\b/,
  ],
];

export function detectSeniority(normalizedTitle: string): Seniority {
  for (const [seniority, pattern] of SENIORITY_PATTERNS) {
    if (pattern.test(normalizedTitle)) return seniority;
  }
  return Seniority.UNKNOWN;
}

/** Seniority levels that can plausibly sponsor or own a transformation budget. */
const LEADERSHIP_SENIORITIES: Seniority[] = [
  Seniority.C_LEVEL,
  Seniority.EVP,
  Seniority.SVP,
  Seniority.VP,
  Seniority.HEAD,
  Seniority.DIRECTOR,
  Seniority.SENIOR_MANAGER,
];

export function isLeadership(seniority: Seniority): boolean {
  return LEADERSHIP_SENIORITIES.includes(seniority);
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = phrase.toLowerCase().trim();
  if (!needle) return false;
  return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack);
}

function matchesAny(haystack: string | null | undefined, list: string[]): string | null {
  if (!haystack) return null;
  const value = haystack.toLowerCase();
  for (const entry of list) {
    if (containsPhrase(value, entry) || value.includes(entry)) return entry;
  }
  return null;
}

/**
 * True when a campaign term is specific enough to stand on its own, i.e. it is a
 * multi-word phrase ("customer experience") or a single word that is not one of
 * the notoriously ambiguous ones ("customer").
 */
export function isStrongTerm(term: string): boolean {
  const normalized = term.toLowerCase().trim();
  if (normalized.includes(' ')) return true;
  return !AMBIGUOUS_TERMS.includes(normalized);
}

export interface ProblemAffinity {
  /** Specific phrase evidence found in the title. */
  strongTitleMatches: string[];
  /** Bare ambiguous words found in the title - never sufficient on their own. */
  weakTitleMatches: string[];
  departmentMatch: string | null;
  functionMatch: string | null;
  /** Number of independent evidence sources supporting genuine ownership. */
  evidenceCount: number;
}

/**
 * Measures how strongly a contact is connected to the campaign's business
 * problem, deliberately separating specific phrase evidence from bare keyword
 * coincidence.
 */
export function assessProblemAffinity(
  contact: Pick<
    ContactInput,
    'normalizedJobTitle' | 'department' | 'jobFunction' | 'directProblemResponsibility'
  >,
  campaign: Pick<CampaignInput, 'problemOwnershipTerms' | 'targetJobFunctions'>,
): ProblemAffinity {
  const title = contact.normalizedJobTitle || '';
  const strongTitleMatches: string[] = [];
  const weakTitleMatches: string[] = [];

  for (const term of campaign.problemOwnershipTerms) {
    if (!containsPhrase(title, term)) continue;
    if (isStrongTerm(term)) strongTitleMatches.push(term);
    else weakTitleMatches.push(term);
  }

  const departmentMatch =
    matchesAny(contact.department, campaign.problemOwnershipTerms) ??
    matchesAny(contact.department, OPERATIONAL_DEPARTMENTS);
  const functionMatch =
    matchesAny(contact.jobFunction, campaign.targetJobFunctions) ??
    matchesAny(contact.jobFunction, campaign.problemOwnershipTerms);

  let evidenceCount = 0;
  if (strongTitleMatches.length > 0) evidenceCount += 1;
  if (departmentMatch) evidenceCount += 1;
  if (functionMatch) evidenceCount += 1;
  if (contact.directProblemResponsibility) evidenceCount += 1;

  return { strongTitleMatches, weakTitleMatches, departmentMatch, functionMatch, evidenceCount };
}

/**
 * Classifies a contact into the configurable role taxonomy.
 *
 * The rule that matters: a bare ambiguous keyword in the job title (the classic
 * "customer" problem) produces PERIPHERAL/UNKNOWN unless it is corroborated by
 * the department, the job function, or an explicitly recorded responsibility.
 */
export function classifyRoleCategory(
  contact: Pick<
    ContactInput,
    | 'normalizedJobTitle'
    | 'department'
    | 'jobFunction'
    | 'seniority'
    | 'decisionRole'
    | 'ownsBudget'
    | 'influencesDecision'
    | 'directProblemResponsibility'
  >,
  campaign: Pick<CampaignInput, 'problemOwnershipTerms' | 'targetJobFunctions'>,
): RoleClassification {
  const affinity = assessProblemAffinity(contact, campaign);
  const title = contact.normalizedJobTitle || '';
  const signals: string[] = [];
  const rejectedSignals: string[] = [];

  for (const match of affinity.strongTitleMatches) {
    signals.push(`Title contains the specific phrase "${match}".`);
  }
  for (const match of affinity.weakTitleMatches) {
    rejectedSignals.push(
      `Title contains the ambiguous word "${match}", which is not on its own evidence of ownership.`,
    );
  }
  if (affinity.departmentMatch) signals.push(`Department "${contact.department}" owns this area.`);
  if (affinity.functionMatch) signals.push(`Job function "${contact.jobFunction}" is in scope.`);
  if (contact.directProblemResponsibility) {
    signals.push('Research recorded direct responsibility for the campaign problem.');
  }

  const peripheralDepartment = matchesAny(contact.department, PERIPHERAL_DEPARTMENTS);
  const procurementDepartment =
    matchesAny(contact.department, PROCUREMENT_DEPARTMENTS) ??
    matchesAny(title, PROCUREMENT_DEPARTMENTS);
  const technicalDepartment =
    matchesAny(contact.department, TECHNICAL_DEPARTMENTS) ?? matchesAny(title, TECHNICAL_DEPARTMENTS);

  const corroborated = affinity.evidenceCount >= 2;
  const leadership = isLeadership(contact.seniority);

  let category: RoleCategory = RoleCategory.UNKNOWN;
  let confidence: DataConfidence = DataConfidence.LOW;

  if (procurementDepartment && !contact.directProblemResponsibility) {
    category = RoleCategory.PROCUREMENT;
    confidence = DataConfidence.MEDIUM;
    signals.push(`Procurement function detected ("${procurementDepartment}").`);
  } else if (contact.directProblemResponsibility && corroborated && leadership) {
    category = RoleCategory.DIRECT_OWNER;
    confidence = affinity.evidenceCount >= 3 ? DataConfidence.HIGH : DataConfidence.MEDIUM;
  } else if (corroborated && (leadership || contact.seniority === Seniority.MANAGER)) {
    category = RoleCategory.OPERATIONAL_OWNER;
    confidence = affinity.evidenceCount >= 3 ? DataConfidence.HIGH : DataConfidence.MEDIUM;
  } else if (
    contact.seniority === Seniority.C_LEVEL &&
    (contact.ownsBudget || contact.influencesDecision)
  ) {
    // A CEO/COO can sponsor the initiative without personally owning the work.
    category = RoleCategory.EXECUTIVE_SPONSOR;
    confidence = DataConfidence.MEDIUM;
    signals.push('C-level sponsor with budget or decision influence.');
  } else if (technicalDepartment && (corroborated || contact.influencesDecision)) {
    category = RoleCategory.TECHNICAL_EVALUATOR;
    confidence = DataConfidence.MEDIUM;
    signals.push(`Technical evaluation function detected ("${technicalDepartment}").`);
  } else if (affinity.evidenceCount === 1 && contact.influencesDecision && leadership) {
    category = RoleCategory.BUSINESS_INFLUENCER;
    confidence = DataConfidence.LOW;
    signals.push('Adjacent leader with recorded decision influence.');
  } else if (
    corroborated &&
    (contact.seniority === Seniority.INDIVIDUAL_CONTRIBUTOR ||
      contact.seniority === Seniority.TEAM_LEAD)
  ) {
    category = RoleCategory.END_USER;
    confidence = DataConfidence.MEDIUM;
    signals.push('Works in the problem area but at execution level.');
  } else if (peripheralDepartment || affinity.weakTitleMatches.length > 0) {
    category = RoleCategory.PERIPHERAL;
    confidence = DataConfidence.MEDIUM;
    if (peripheralDepartment) {
      signals.push(`Department "${contact.department}" does not own this problem.`);
    }
  } else {
    category = RoleCategory.UNKNOWN;
    confidence = DataConfidence.UNVERIFIED;
    rejectedSignals.push('Not enough role evidence to classify - needs research review.');
  }

  return {
    category,
    confidence,
    signals,
    rejectedSignals,
    ownershipEvidenceCount: affinity.evidenceCount,
  };
}

/** Human-readable label for the taxonomy, used across the UI. */
export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  DIRECT_OWNER: 'Direct owner',
  OPERATIONAL_OWNER: 'Operational owner',
  EXECUTIVE_SPONSOR: 'Executive sponsor',
  TECHNICAL_EVALUATOR: 'Technical evaluator',
  BUSINESS_INFLUENCER: 'Business influencer',
  PROCUREMENT: 'Procurement',
  END_USER: 'End user',
  PERIPHERAL: 'Peripheral',
  UNKNOWN: 'Unknown',
};

export const DECISION_ROLE_LABELS: Record<DecisionRole, string> = {
  DECISION_MAKER: 'Decision maker',
  INFLUENCER: 'Influencer',
  EVALUATOR: 'Evaluator',
  RECOMMENDER: 'Recommender',
  GATEKEEPER: 'Gatekeeper',
  USER: 'User',
  UNKNOWN: 'Unknown',
};
