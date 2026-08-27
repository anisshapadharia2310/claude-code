/**
 * Tunable business constants. Everything here is a policy decision rather than
 * a law of nature, so it lives in one place and is referenced by name.
 */

/** A contact record older than this is considered stale by the relevance gate. */
export const STALE_AFTER_DAYS = 180;

/** Records approaching staleness are surfaced in the data-quality screen. */
export const STALE_WARNING_DAYS = 120;

/** Total score at or above which a contact is P1 eligible. */
export const P1_SCORE_THRESHOLD = 80;
export const P2_SCORE_THRESHOLD = 60;
export const P3_SCORE_THRESHOLD = 40;

/** Additional gates a contact must clear for P1 (score alone is not enough). */
export const P1_MIN_ROLE_RELEVANCE = 18;
export const P1_MIN_DATA_QUALITY = 7;

/** Contacts within this many points of P1 are routed to the review queue. */
export const NEAR_P1_BAND = 6;

/** Hours (in the contact's local time) considered a convenient event slot. */
export const CONVENIENT_LOCAL_HOUR_START = 8;
export const CONVENIENT_LOCAL_HOUR_END = 18;

/** Registering this many days before the event counts as early registration. */
export const EARLY_REGISTRATION_DAYS = 3;

/** Hard ceiling on the total score, including post-webinar engagement points. */
export const MAX_TOTAL_SCORE = 100;

/**
 * Single words that appear in a huge number of unrelated job titles. A match on
 * one of these alone is never treated as evidence of problem ownership - this is
 * the exact failure mode SIGNAL exists to prevent (for example a "Customer
 * Account Executive" in sales is not an owner of customer experience).
 */
export const AMBIGUOUS_TERMS = [
  'customer',
  'client',
  'consumer',
  'service',
  'services',
  'experience',
  'success',
  'support',
  'care',
  'account',
  'accounts',
  'digital',
  'data',
  'operations',
  'transformation',
  'solutions',
  'business',
  'technology',
  'energy',
  'infrastructure',
];

/** Departments/functions that corroborate ownership of an operational problem. */
export const OPERATIONAL_DEPARTMENTS = [
  'customer experience',
  'customer service',
  'customer operations',
  'customer care',
  'customer success',
  'contact centre',
  'contact center',
  'call centre',
  'call center',
  'service delivery',
  'operations',
  'business transformation',
  'digital transformation',
  'transformation',
  'field operations',
  'network operations',
  'asset management',
];

export const TECHNICAL_DEPARTMENTS = [
  'information technology',
  'it',
  'engineering',
  'architecture',
  'software',
  'data science',
  'analytics',
  'security',
  'infrastructure',
  'platform',
];

export const PROCUREMENT_DEPARTMENTS = [
  'procurement',
  'purchasing',
  'sourcing',
  'vendor management',
  'supply chain',
];

/** Departments that are almost never the owner of a CX/service/ops problem. */
export const PERIPHERAL_DEPARTMENTS = [
  'sales',
  'business development',
  'account management',
  'recruiting',
  'talent acquisition',
  'legal',
  'facilities',
  'payroll',
  'tax',
  'audit',
  'investor relations',
  'public relations',
];
