/**
 * Scoring weights.
 *
 * The default model is the 100-point SIGNAL scorecard. Administrators may edit
 * the weights per campaign; validateWeights() enforces that the bands still add
 * up to 100 and that each band's components add up to that band's maximum.
 */
import type { ScoreBand, ScoringWeights, WeightValidationResult, WeightValidationIssue } from './types';

export interface ComponentDefinition {
  code: string;
  band: ScoreBand;
  label: string;
  description: string;
  defaultPoints: number;
}

/** Every component in the default model, in scorecard order. */
export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  // A - Company fit (25)
  { code: 'A_INDUSTRY', band: 'A', label: 'Target industry match', defaultPoints: 8, description: 'The account sits in an industry or sub-industry the campaign targets.' },
  { code: 'A_GEOGRAPHY', band: 'A', label: 'Target geography match', defaultPoints: 5, description: 'The account is in a country the campaign targets.' },
  { code: 'A_SIZE_BAND', band: 'A', label: 'Target employee or revenue band', defaultPoints: 5, description: 'The account falls inside the targeted size or revenue range.' },
  { code: 'A_TECHNOLOGY', band: 'A', label: 'Relevant technology or business model', defaultPoints: 4, description: 'The account runs a technology the campaign targets, or a competing one.' },
  { code: 'A_NAMED_ACCOUNT', band: 'A', label: 'Named strategic account or existing relationship', defaultPoints: 3, description: 'The account is named strategic, or is a current, past or partner relationship.' },

  // B - Contact-role relevance (25)
  { code: 'B_DIRECT_OWNER', band: 'B', label: 'Direct owner of the campaign problem', defaultPoints: 12, description: 'Classified a direct owner, with researcher-confirmed responsibility, in a matching function. Never awarded on a title keyword alone.' },
  { code: 'B_OPERATIONAL_OWNER', band: 'B', label: 'Operational owner or strong business influencer', defaultPoints: 8, description: 'Runs the work day to day, or demonstrably shapes the decision.' },
  { code: 'B_SENIORITY', band: 'B', label: 'Relevant seniority', defaultPoints: 3, description: 'Seniority falls in the campaign target range. Seniority alone can never qualify a contact.' },
  { code: 'B_BUDGET_INFLUENCE', band: 'B', label: 'Budget or decision influence', defaultPoints: 2, description: 'Owns budget or influences the buying decision.' },

  // C - Current business trigger (20)
  { code: 'C_HIRING', band: 'C', label: 'Relevant hiring activity', defaultPoints: 5, description: 'Open job postings relevant to the campaign problem.' },
  { code: 'C_TRANSFORMATION', band: 'C', label: 'Active transformation or implementation project', defaultPoints: 5, description: 'A transformation or implementation programme is under way.' },
  { code: 'C_EXPANSION_MA', band: 'C', label: 'Expansion, merger or restructuring', defaultPoints: 3, description: 'Expansion, merger, acquisition or restructuring activity.' },
  { code: 'C_LEADERSHIP_CHANGE', band: 'C', label: 'Relevant leadership change', defaultPoints: 2, description: 'A new leader has taken over the relevant function.' },
  { code: 'C_REGULATORY', band: 'C', label: 'Regulatory or operational pressure', defaultPoints: 3, description: 'Regulatory obligation or operational pressure creating urgency.' },
  { code: 'C_STATED_PRIORITY', band: 'C', label: 'Publicly stated priority or problem', defaultPoints: 2, description: 'The company has publicly stated this as a priority.' },

  // D - Engagement and intent (15)
  { code: 'D_POSITIVE_REPLY', band: 'D', label: 'Positive email reply', defaultPoints: 5, description: 'The contact replied positively to outreach.' },
  { code: 'D_WHITEPAPER_DOWNLOAD', band: 'D', label: 'White-paper download', defaultPoints: 3, description: 'The contact downloaded the campaign white paper.' },
  { code: 'D_WEBINAR_REGISTRATION', band: 'D', label: 'Webinar registration', defaultPoints: 4, description: 'The contact registered for the webinar.' },
  { code: 'D_RESOURCE_CLICK', band: 'D', label: 'Relevant resource click', defaultPoints: 2, description: 'The contact clicked a campaign resource or call to action.' },
  { code: 'D_PRIOR_ENGAGEMENT', band: 'D', label: 'Previous attendance or meeting', defaultPoints: 1, description: 'The contact attended a previous event or took a meeting.' },

  // E - Data quality and reachability (10)
  { code: 'E_VERIFIED_TITLE', band: 'E', label: 'Current verified job title', defaultPoints: 2, description: 'The job title has been verified inside the freshness window.' },
  { code: 'E_VERIFIED_EMAIL', band: 'E', label: 'Verified work email', defaultPoints: 2, description: 'A verified or valid work email is on record.' },
  { code: 'E_VALID_PHONE', band: 'E', label: 'Valid phone number', defaultPoints: 2, description: 'A verified or valid phone number is on record.' },
  { code: 'E_GEO_TIMEZONE', band: 'E', label: 'Correct country and time zone', defaultPoints: 1, description: 'Country resolves to a known market and a time zone is set.' },
  { code: 'E_SOURCE_RECORDED', band: 'E', label: 'Contact source recorded', defaultPoints: 1, description: 'The provenance of the record is documented.' },
  { code: 'E_LAST_VERIFIED', band: 'E', label: 'Last verification date recorded', defaultPoints: 1, description: 'A last-verified date exists on the record.' },
  { code: 'E_CONSENT_RECORDED', band: 'E', label: 'Consent or permitted-outreach status recorded', defaultPoints: 1, description: 'A consent or permitted-outreach status is on record.' },

  // F - Attendance likelihood (5)
  { code: 'F_PRIOR_ATTENDANCE', band: 'F', label: 'Previous event attendance', defaultPoints: 2, description: 'The contact has attended a previous event.' },
  { code: 'F_EARLY_REGISTRATION', band: 'F', label: 'Early registration', defaultPoints: 1, description: 'Registered well ahead of the event date.' },
  { code: 'F_CONVENIENT_TIME', band: 'F', label: 'Convenient local event time', defaultPoints: 1, description: 'The event falls inside local working hours for this contact.' },
  { code: 'F_EXPLICIT_REQUEST', band: 'F', label: 'Explicit request for the link or reminder', defaultPoints: 1, description: 'The contact asked for the joining link or a reminder.' },
];

export const COMPONENTS_BY_CODE: Record<string, ComponentDefinition> = Object.fromEntries(
  COMPONENT_DEFINITIONS.map((definition) => [definition.code, definition]),
);

export const COMPONENTS_BY_BAND: Record<ScoreBand, ComponentDefinition[]> = {
  A: COMPONENT_DEFINITIONS.filter((c) => c.band === 'A'),
  B: COMPONENT_DEFINITIONS.filter((c) => c.band === 'B'),
  C: COMPONENT_DEFINITIONS.filter((c) => c.band === 'C'),
  D: COMPONENT_DEFINITIONS.filter((c) => c.band === 'D'),
  E: COMPONENT_DEFINITIONS.filter((c) => c.band === 'E'),
  F: COMPONENT_DEFINITIONS.filter((c) => c.band === 'F'),
};

export const DEFAULT_BAND_MAX: Record<ScoreBand, number> = { A: 25, B: 25, C: 20, D: 15, E: 10, F: 5 };

export const DEFAULT_THRESHOLDS = {
  p1: 80,
  p2: 60,
  p3: 40,
  p1MinRoleRelevance: 18,
  p1MinDataQuality: 7,
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  bandMax: { ...DEFAULT_BAND_MAX },
  componentMax: Object.fromEntries(
    COMPONENT_DEFINITIONS.map((definition) => [definition.code, definition.defaultPoints]),
  ),
  thresholds: { ...DEFAULT_THRESHOLDS },
};

export function cloneDefaultWeights(): ScoringWeights {
  return {
    bandMax: { ...DEFAULT_BAND_MAX },
    componentMax: { ...DEFAULT_WEIGHTS.componentMax },
    thresholds: { ...DEFAULT_THRESHOLDS },
  };
}

const BANDS: ScoreBand[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Validate a weight configuration.
 *
 * Rules:
 *   - every component has a non-negative integer weight;
 *   - each band's components sum exactly to that band's maximum;
 *   - the six band maxima sum exactly to 100;
 *   - thresholds are ordered and inside the achievable range.
 */
export function validateWeights(weights: ScoringWeights): WeightValidationResult {
  const issues: WeightValidationIssue[] = [];

  for (const definition of COMPONENT_DEFINITIONS) {
    const value = weights.componentMax[definition.code];
    if (value === undefined) {
      issues.push({ path: `componentMax.${definition.code}`, message: `Missing weight for "${definition.label}".` });
      continue;
    }
    if (!Number.isInteger(value) || value < 0) {
      issues.push({ path: `componentMax.${definition.code}`, message: `"${definition.label}" must be a non-negative whole number.` });
    }
  }

  let total = 0;
  for (const band of BANDS) {
    const bandMax = weights.bandMax[band];
    if (!Number.isInteger(bandMax) || bandMax < 0) {
      issues.push({ path: `bandMax.${band}`, message: `Band ${band} maximum must be a non-negative whole number.` });
      continue;
    }
    total += bandMax;
    const componentSum = COMPONENTS_BY_BAND[band].reduce(
      (sum, definition) => sum + (weights.componentMax[definition.code] ?? 0),
      0,
    );
    if (componentSum !== bandMax) {
      issues.push({
        path: `bandMax.${band}`,
        message: `Band ${band} components add up to ${componentSum} but the band maximum is ${bandMax}.`,
      });
    }
  }

  if (total !== 100) {
    issues.push({ path: 'bandMax', message: `Scoring weights must add up to 100. They currently add up to ${total}.` });
  }

  const { p1, p2, p3, p1MinRoleRelevance, p1MinDataQuality } = weights.thresholds;
  if (!(p3 < p2 && p2 < p1)) {
    issues.push({ path: 'thresholds', message: 'Thresholds must increase: P3 < P2 < P1.' });
  }
  if (p1 > 100 || p3 < 0) {
    issues.push({ path: 'thresholds', message: 'Thresholds must sit between 0 and 100.' });
  }
  if (p1MinRoleRelevance > weights.bandMax.B) {
    issues.push({
      path: 'thresholds.p1MinRoleRelevance',
      message: `The P1 role-relevance minimum (${p1MinRoleRelevance}) cannot exceed the band B maximum (${weights.bandMax.B}).`,
    });
  }
  if (p1MinDataQuality > weights.bandMax.E) {
    issues.push({
      path: 'thresholds.p1MinDataQuality',
      message: `The P1 data-quality minimum (${p1MinDataQuality}) cannot exceed the band E maximum (${weights.bandMax.E}).`,
    });
  }

  return { valid: issues.length === 0, issues, total };
}
