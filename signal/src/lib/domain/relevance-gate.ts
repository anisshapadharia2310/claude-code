import { ConsentStatus, RoleCategory } from '@prisma/client';
import { STALE_AFTER_DAYS } from './constants';
import type {
  AccountInput,
  CampaignInput,
  ComplianceGateResult,
  ContactInput,
  GateCheck,
  RelevanceGateResult,
} from './types';

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function listIncludes(list: string[], value: string | null | undefined): boolean {
  const target = normalize(value);
  if (!target) return false;
  return list.some((entry) => normalize(entry) === target);
}

/** Role categories that can never be considered an owner of the problem. */
const NON_OWNER_CATEGORIES: RoleCategory[] = [RoleCategory.PERIPHERAL, RoleCategory.UNKNOWN];

export interface RelevanceGateInput {
  account: AccountInput;
  contact: ContactInput;
  campaign: CampaignInput;
  compliance: ComplianceGateResult;
  now?: Date;
}

/**
 * The mandatory relevance gate. It runs before a priority is assigned and is
 * evaluated independently of the numeric score: a contact that fails a blocking
 * check cannot be promoted no matter how many points they accumulated.
 */
export function evaluateRelevanceGate({
  account,
  contact,
  campaign,
  compliance,
  now = new Date(),
}: RelevanceGateInput): RelevanceGateResult {
  const checks: GateCheck[] = [];

  // 1. Company is in a target industry.
  const industryMatch =
    campaign.targetIndustries.length === 0 ||
    listIncludes(campaign.targetIndustries, account.industry) ||
    listIncludes(campaign.targetSubIndustries, account.subIndustry);
  checks.push({
    key: 'industry',
    label: 'Company is in a target industry',
    passed: industryMatch,
    blocking: true,
    detail: industryMatch
      ? `${account.industry} is in scope for this campaign.`
      : `${account.industry} is not one of the campaign's target industries.`,
  });

  // 2. Company is in a target geography.
  const geographyMatch =
    campaign.targetCountries.length === 0 || listIncludes(campaign.targetCountries, account.country);
  checks.push({
    key: 'geography',
    label: 'Company is in a target geography',
    passed: geographyMatch,
    blocking: true,
    detail: geographyMatch
      ? `${account.country} is a target country.`
      : `${account.country} is outside the campaign's target countries.`,
  });

  // 3. The contact's current role is related to the campaign problem.
  const relevantCategories =
    campaign.relevantRoleCategories.length > 0
      ? campaign.relevantRoleCategories
      : campaign.targetRoleCategories;
  const roleRelated =
    !NON_OWNER_CATEGORIES.includes(contact.roleCategory) &&
    (relevantCategories.length === 0 || relevantCategories.includes(contact.roleCategory));
  checks.push({
    key: 'roleRelated',
    label: 'Current role is related to the campaign problem',
    passed: roleRelated,
    blocking: true,
    detail: roleRelated
      ? `Role category ${contact.roleCategory} is marked relevant for this campaign.`
      : contact.roleCategory === RoleCategory.UNKNOWN
        ? 'Role category is unknown - research review required before outreach.'
        : `Role category ${contact.roleCategory} is not relevant to "${campaign.targetBusinessProblem}".`,
  });

  // 4. The contact owns or influences the relevant problem.
  const ownsOrInfluences =
    contact.directProblemResponsibility || contact.ownsBudget || contact.influencesDecision;
  checks.push({
    key: 'ownership',
    label: 'Contact owns or influences the problem',
    passed: ownsOrInfluences,
    blocking: true,
    detail: ownsOrInfluences
      ? 'Recorded as responsible for, budget holder of, or an influencer on this problem.'
      : 'No recorded ownership, budget authority, or decision influence for this problem.',
  });

  // 5. Contact data is current.
  const dataCurrent =
    !!contact.lastVerifiedAt && daysBetween(now, contact.lastVerifiedAt) <= STALE_AFTER_DAYS;
  checks.push({
    key: 'dataCurrent',
    label: 'Contact data is current',
    passed: dataCurrent,
    blocking: true,
    detail: contact.lastVerifiedAt
      ? `Last verified ${daysBetween(now, contact.lastVerifiedAt)} days ago (limit ${STALE_AFTER_DAYS}).`
      : 'No verification date recorded.',
  });

  // 6. The contact has acceptable communication permission.
  const hasPermittedChannel = compliance.allowedChannels.length > 0;
  checks.push({
    key: 'permission',
    label: 'Acceptable communication permission exists',
    passed: hasPermittedChannel,
    blocking: true,
    detail: hasPermittedChannel
      ? `Permitted channels: ${compliance.allowedChannels.join(', ')}.`
      : 'No channel is currently permitted for this contact.',
  });

  // 7. The contact is not opted out.
  const notOptedOut =
    contact.consentStatus !== ConsentStatus.OPT_OUT &&
    contact.consentStatus !== ConsentStatus.DO_NOT_CONTACT &&
    compliance.outcome !== 'BLOCK';
  checks.push({
    key: 'notOptedOut',
    label: 'Contact is not opted out',
    passed: notOptedOut,
    blocking: true,
    detail: notOptedOut ? 'No opt-out on record.' : 'Contact has opted out or is marked do-not-contact.',
  });

  // 8. The contact is not a duplicate.
  checks.push({
    key: 'notDuplicate',
    label: 'Contact is not a duplicate',
    passed: !contact.isDuplicate,
    blocking: true,
    detail: contact.isDuplicate
      ? 'Flagged as a duplicate of an existing record.'
      : 'No duplicate match found.',
  });

  const failures = checks.filter((c) => c.blocking && !c.passed).map((c) => c.label);

  return {
    passed: failures.length === 0,
    // Role relevance is called out separately: an irrelevant role bars P1 even
    // when every other check happens to pass.
    roleEligibleForP1: roleRelated && ownsOrInfluences,
    checks,
    failures,
  };
}
