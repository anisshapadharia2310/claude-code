/**
 * The mandatory relevance gate.
 *
 * Runs before any priority is assigned. Nothing reaches P1 without passing
 * every blocking check and every review check.
 *
 * Severity tiers:
 *   BLOCKING - the contact cannot be worked at all. Produces REJECT.
 *   REVIEW   - the contact can be worked, but not as a P1 until a researcher
 *              resolves the issue.
 *   ADVISORY - noted in the UI, no effect on priority.
 */
import { assessCampaignRelevance, type CampaignRelevanceResult } from './taxonomy';
import { daysBetween, listIncludes } from './normalize';
import type {
  Account,
  Campaign,
  ComplianceResult,
  Contact,
  GateCheck,
  RelevanceGateResult,
} from './types';

/** Beyond this, a record is treated as outdated and rejected. */
export const STALE_REJECT_DAYS = 540;
/** Beyond this, a record must be re-verified before it can be a P1. */
export const STALE_REVIEW_DAYS = 180;

export interface RelevanceGateInput {
  account: Account;
  contact: Contact;
  campaign: Campaign;
  compliance: ComplianceResult;
  now?: Date;
}

export interface RelevanceGateOutput extends RelevanceGateResult {
  relevance: CampaignRelevanceResult;
}

export function runRelevanceGate(input: RelevanceGateInput): RelevanceGateOutput {
  const { account, contact, campaign, compliance } = input;
  const now = input.now ?? new Date();
  const checks: GateCheck[] = [];

  // 1. Company is in a target industry -------------------------------------
  const industryMatch =
    campaign.targetIndustries.length === 0
    || listIncludes(campaign.targetIndustries, account.industry)
    || listIncludes(campaign.targetSubIndustries, account.subIndustry);
  checks.push({
    code: 'TARGET_INDUSTRY',
    label: 'Company is in a target industry',
    passed: industryMatch,
    severity: 'BLOCKING',
    detail: campaign.targetIndustries.length === 0
      ? 'Campaign does not restrict industry.'
      : industryMatch
        ? `${account.industry} is a target industry for this campaign.`
        : `${account.industry} is not in the campaign's target industries (${campaign.targetIndustries.join(', ')}).`,
  });

  // 2. Company is in a target geography ------------------------------------
  const countryMatch =
    campaign.targetCountries.length === 0 || listIncludes(campaign.targetCountries, account.country);
  checks.push({
    code: 'TARGET_GEOGRAPHY',
    label: 'Company is in a target geography',
    passed: countryMatch,
    severity: 'BLOCKING',
    detail: campaign.targetCountries.length === 0
      ? 'Campaign does not restrict geography.'
      : countryMatch
        ? `${account.country} is a target country.`
        : `${account.country} is not in the campaign's target countries (${campaign.targetCountries.join(', ')}).`,
  });

  if (campaign.targetCities.length > 0 && account.city) {
    const cityMatch = listIncludes(campaign.targetCities, account.city);
    checks.push({
      code: 'TARGET_CITY',
      label: 'Company is in a priority city',
      passed: cityMatch,
      severity: 'ADVISORY',
      detail: cityMatch
        ? `${account.city} is a priority city for this campaign.`
        : `${account.city} is outside the campaign's priority cities. Country still matches.`,
    });
  }

  // 3. Contact's role relates to the campaign problem ----------------------
  const relevance = assessCampaignRelevance(
    {
      normalizedJobTitle: contact.normalizedJobTitle,
      department: contact.department,
      roleCategory: contact.roleCategory,
      seniority: contact.seniority,
      ownsBudget: contact.ownsBudget,
      influencesDecision: contact.influencesDecision,
      directProblemResponsibility: contact.directProblemResponsibility,
    },
    {
      targetJobFunctions: campaign.targetJobFunctions,
      targetRoleCategories: campaign.targetRoleCategories,
      targetSeniorities: campaign.targetSeniorities,
      relevantTitleTerms: campaign.relevantTitleTerms,
      excludedTitleTerms: campaign.excludedTitleTerms,
      relevantDepartments: campaign.relevantDepartments,
    },
  );

  checks.push({
    code: 'ROLE_RELATED',
    label: 'Role relates to the campaign problem',
    passed: relevance.relevant,
    severity: 'BLOCKING',
    detail: relevance.explanation,
  });

  // 4. Contact owns or influences the problem ------------------------------
  const ownsOrInfluences =
    relevance.directOwnership
    || relevance.operationalOwnership
    || contact.ownsBudget
    || contact.influencesDecision;
  checks.push({
    code: 'OWNS_OR_INFLUENCES',
    label: 'Contact owns or influences the problem',
    passed: ownsOrInfluences,
    severity: 'BLOCKING',
    detail: ownsOrInfluences
      ? [
          relevance.directOwnership ? 'accountable for the outcome' : null,
          relevance.operationalOwnership ? 'runs or shapes the work' : null,
          contact.ownsBudget ? 'owns budget' : null,
          contact.influencesDecision ? 'influences the decision' : null,
        ].filter(Boolean).join('; ')
      : 'No recorded ownership, budget control or decision influence for this problem.',
  });

  // 5. Contact data is current ---------------------------------------------
  const verifiedAgeDays = contact.lastVerifiedAt ? daysBetween(contact.lastVerifiedAt, now) : null;
  const outdated = verifiedAgeDays !== null && verifiedAgeDays > STALE_REJECT_DAYS;
  const neverVerifiedAndUnreachable =
    contact.lastVerifiedAt === null
    && (contact.emailStatus === 'INVALID' || contact.emailStatus === 'BOUNCED' || contact.emailStatus === 'MISSING')
    && (contact.phoneStatus === 'INVALID' || contact.phoneStatus === 'MISSING' || contact.phoneStatus === 'WRONG_NUMBER');

  checks.push({
    code: 'DATA_NOT_OUTDATED',
    label: 'Contact record is not outdated',
    passed: !outdated && !neverVerifiedAndUnreachable,
    severity: 'BLOCKING',
    detail: outdated
      ? `Last verified ${verifiedAgeDays} days ago, beyond the ${STALE_REJECT_DAYS}-day limit.`
      : neverVerifiedAndUnreachable
        ? 'Never verified and no usable email or phone on record.'
        : verifiedAgeDays === null
          ? 'No verification date recorded, but the contact is still reachable.'
          : `Last verified ${verifiedAgeDays} days ago.`,
  });

  const needsReverification =
    verifiedAgeDays === null || (verifiedAgeDays > STALE_REVIEW_DAYS && verifiedAgeDays <= STALE_REJECT_DAYS);
  checks.push({
    code: 'DATA_CURRENT',
    label: 'Contact data is current',
    passed: !needsReverification,
    severity: 'REVIEW',
    detail: verifiedAgeDays === null
      ? 'No last-verified date recorded. Re-verify before promoting to P1.'
      : needsReverification
        ? `Last verified ${verifiedAgeDays} days ago, beyond the ${STALE_REVIEW_DAYS}-day freshness window for P1.`
        : `Verified ${verifiedAgeDays} days ago.`,
  });

  // 6. Acceptable communication permission ---------------------------------
  const hasChannel = compliance.allowedChannels.length > 0;
  checks.push({
    code: 'COMMUNICATION_PERMISSION',
    label: 'At least one channel is permitted',
    passed: hasChannel,
    severity: 'BLOCKING',
    detail: hasChannel
      ? `Permitted: ${compliance.allowedChannels.join(', ')}.`
      : 'No permitted channel. ' + compliance.summary,
  });

  checks.push({
    code: 'COMPLIANCE_COMPLETE',
    label: 'Compliance record is complete',
    passed: compliance.status !== 'HOLD',
    severity: 'REVIEW',
    detail: compliance.status === 'HOLD'
      ? `Missing ${compliance.missingFields.join(', ')}.`
      : 'All required compliance fields are recorded.',
  });

  // 7. Not opted out --------------------------------------------------------
  const optedOut =
    compliance.doNotContact
    || contact.consentStatus === 'OPT_OUT'
    || contact.consentStatus === 'DO_NOT_CONTACT';
  checks.push({
    code: 'NOT_OPTED_OUT',
    label: 'Contact has not opted out',
    passed: !optedOut,
    severity: 'BLOCKING',
    detail: optedOut
      ? 'Contact has opted out or is marked do-not-contact.'
      : 'No opt-out on record.',
  });

  // 8. Not a duplicate ------------------------------------------------------
  checks.push({
    code: 'NOT_DUPLICATE',
    label: 'Contact is not a duplicate',
    passed: !contact.isDuplicate,
    severity: 'BLOCKING',
    detail: contact.isDuplicate
      ? `Marked as a duplicate of contact ${contact.duplicateOfId ?? 'unknown'}.`
      : 'No duplicate match found.',
  });

  // --- role confidence is a review-tier concern ---------------------------
  const lowConfidence = contact.roleConfidence === 'LOW' || contact.roleConfidence === 'UNKNOWN';
  checks.push({
    code: 'ROLE_CONFIDENCE',
    label: 'Role classification is confident',
    passed: !lowConfidence,
    severity: 'REVIEW',
    detail: lowConfidence
      ? `Role confidence is ${contact.roleConfidence}. A researcher must confirm ownership before P1.`
      : `Role confidence is ${contact.roleConfidence}.`,
  });

  const blockingFailures = checks
    .filter((check) => !check.passed && check.severity === 'BLOCKING')
    .map((check) => `${check.label}: ${check.detail}`);
  const reviewFailures = checks
    .filter((check) => !check.passed && check.severity === 'REVIEW')
    .map((check) => `${check.label}: ${check.detail}`);
  const advisories = checks
    .filter((check) => !check.passed && check.severity === 'ADVISORY')
    .map((check) => `${check.label}: ${check.detail}`);

  return {
    passed: blockingFailures.length === 0,
    allowsP1: blockingFailures.length === 0 && reviewFailures.length === 0,
    checks,
    blockingFailures,
    reviewFailures,
    advisories,
    relevance,
  };
}
