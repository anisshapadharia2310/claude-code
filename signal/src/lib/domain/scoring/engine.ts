import {
  DataConfidence,
  EmailStatus,
  EventType,
  PhoneStatus,
  Priority,
  RoleCategory,
  Seniority,
  TriggerVerification,
} from '@prisma/client';
import {
  CONVENIENT_LOCAL_HOUR_END,
  CONVENIENT_LOCAL_HOUR_START,
  EARLY_REGISTRATION_DAYS,
  MAX_TOTAL_SCORE,
  NEAR_P1_BAND,
  P1_MIN_DATA_QUALITY,
  P1_MIN_ROLE_RELEVANCE,
  P1_SCORE_THRESHOLD,
  P2_SCORE_THRESHOLD,
  P3_SCORE_THRESHOLD,
  STALE_AFTER_DAYS,
} from '../constants';
import { calculateEngagementBonus } from '../engagement';
import { buildPlaybook } from '../playbook';
import { evaluateRelevanceGate } from '../relevance-gate';
import { assessProblemAffinity, isLeadership } from '../role-taxonomy';
import type {
  AccountInput,
  CampaignInput,
  ComplianceGateResult,
  ContactInput,
  EngagementEventInput,
  ScoreLine,
  ScoringResult,
} from '../types';
import { resolveWeights, type ScoringWeights } from './weights';

export interface ScoringInput {
  account: AccountInput;
  contact: ContactInput;
  campaign: CampaignInput;
  compliance: ComplianceGateResult;
  events?: EngagementEventInput[];
  /** Required before a contact can be promoted to P1. */
  whyThisContact?: string | null;
  weights?: ScoringWeights;
  now?: Date;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function listIncludes(list: string[], value: string | null | undefined): boolean {
  const target = normalize(value);
  return !!target && list.some((entry) => normalize(entry) === target);
}

function intersects(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(normalize));
  return a.filter((entry) => setB.has(normalize(entry)));
}

/** Hour of day at the contact's location, or null when the zone is unknown. */
export function localHour(date: Date, timeZone: string | null | undefined): number | null {
  if (!timeZone) return null;
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hour12: false,
    }).format(date);
    const hour = Number(formatted);
    return Number.isFinite(hour) ? hour : null;
  } catch {
    return null;
  }
}

/**
 * The SIGNAL scoring engine.
 *
 * Produces six component scores, a total, a priority and - critically - a
 * ScoreLine for every criterion whether or not it awarded points, so that the
 * interface can always answer "why does this contact have this score?".
 */
export function scoreContact(input: ScoringInput): ScoringResult {
  const {
    account,
    contact,
    campaign,
    compliance,
    events = [],
    whyThisContact,
    now = new Date(),
  } = input;
  const weights = input.weights ?? resolveWeights(campaign.scoringWeights);
  const lines: ScoreLine[] = [];

  const add = (line: ScoreLine) => {
    lines.push(line);
    return line.points;
  };

  // ---------------------------------------------------------------- A: fit
  const w = weights.companyFit;
  let fit = 0;

  const industryHit = listIncludes(campaign.targetIndustries, account.industry);
  const subIndustryHit = listIncludes(campaign.targetSubIndustries, account.subIndustry);
  const noIndustryConstraint = campaign.targetIndustries.length === 0;
  fit += add({
    component: 'A_FIT',
    code: 'fit.industry',
    label: 'Target industry match',
    points: industryHit || subIndustryHit || noIndustryConstraint ? w.industryMatch : 0,
    max: w.industryMatch,
    reason: industryHit
      ? `${account.industry} is a target industry for this campaign.`
      : subIndustryHit
        ? `Sub-industry ${account.subIndustry} is targeted.`
        : noIndustryConstraint
          ? 'Campaign has no industry restriction.'
          : `${account.industry} is not a target industry.`,
  });

  const countryHit = listIncludes(campaign.targetCountries, account.country);
  const cityHit = listIncludes(campaign.targetCities, account.city);
  const noGeoConstraint = campaign.targetCountries.length === 0;
  const geoPoints = countryHit
    ? campaign.targetCities.length > 0 && !cityHit
      ? Math.max(1, w.geographyMatch - 2)
      : w.geographyMatch
    : noGeoConstraint
      ? w.geographyMatch
      : 0;
  fit += add({
    component: 'A_FIT',
    code: 'fit.geography',
    label: 'Target geography match',
    points: geoPoints,
    max: w.geographyMatch,
    reason: countryHit
      ? cityHit || campaign.targetCities.length === 0
        ? `${account.city ? `${account.city}, ` : ''}${account.country} is in the target geography.`
        : `${account.country} is targeted but ${account.city ?? 'the city'} is not a priority city.`
      : noGeoConstraint
        ? 'Campaign has no geography restriction.'
        : `${account.country} is outside the target geography.`,
  });

  const bandHit =
    campaign.targetEmployeeBands.includes(account.employeeBand) ||
    campaign.targetRevenueBands.includes(account.revenueBand);
  const noBandConstraint =
    campaign.targetEmployeeBands.length === 0 && campaign.targetRevenueBands.length === 0;
  fit += add({
    component: 'A_FIT',
    code: 'fit.size',
    label: 'Target employee or revenue band',
    points: bandHit || noBandConstraint ? w.sizeBand : 0,
    max: w.sizeBand,
    reason: bandHit
      ? `Company size (${account.employeeBand.replace(/_/g, ' ').toLowerCase()} / ${account.revenueBand.replace(/_/g, ' ').toLowerCase()}) is in the target band.`
      : noBandConstraint
        ? 'Campaign has no size restriction.'
        : 'Company size is outside the target bands.',
  });

  const techHit = intersects(account.existingTechnology, campaign.targetTechnologies);
  const competitorHit = intersects(account.competitorTechnology, campaign.targetTechnologies);
  const techPoints = techHit.length
    ? w.technologyOrModel
    : competitorHit.length
      ? Math.max(0, w.technologyOrModel - 1)
      : 0;
  fit += add({
    component: 'A_FIT',
    code: 'fit.technology',
    label: 'Relevant technology or business model',
    points: techPoints,
    max: w.technologyOrModel,
    reason: techHit.length
      ? `Runs relevant technology: ${techHit.join(', ')}.`
      : competitorHit.length
        ? `Runs competitor technology (${competitorHit.join(', ')}) - a displacement opportunity.`
        : 'No relevant technology recorded.',
  });

  const namedOrClient = account.namedAccountStatus || account.existingClientRelationship !== 'NONE';
  fit += add({
    component: 'A_FIT',
    code: 'fit.relationship',
    label: 'Named strategic account or existing relationship',
    points: namedOrClient ? w.namedOrExistingClient : 0,
    max: w.namedOrExistingClient,
    reason: account.namedAccountStatus
      ? 'Flagged as a named strategic account.'
      : account.existingClientRelationship !== 'NONE'
        ? `Existing relationship: ${account.existingClientRelationship.replace(/_/g, ' ').toLowerCase()}.`
        : 'No existing relationship on record.',
  });

  // --------------------------------------------------------------- B: role
  const rw = weights.roleRelevance;
  let roleRelevance = 0;
  const affinity = assessProblemAffinity(contact, campaign);

  // Direct ownership requires the taxonomy classification AND recorded
  // responsibility - a title keyword by itself never earns these points.
  const isDirectOwner =
    contact.roleCategory === RoleCategory.DIRECT_OWNER &&
    contact.directProblemResponsibility &&
    affinity.evidenceCount >= 2;
  roleRelevance += add({
    component: 'B_ROLE',
    code: 'role.directOwner',
    label: 'Direct owner of the campaign problem',
    points: isDirectOwner ? rw.directOwner : 0,
    max: rw.directOwner,
    reason: isDirectOwner
      ? `Classified as direct owner on ${affinity.evidenceCount} independent signals (${describeAffinity(affinity)}).`
      : affinity.weakTitleMatches.length > 0 && affinity.evidenceCount < 2
        ? `Title contains "${affinity.weakTitleMatches.join('", "')}" but nothing corroborates ownership - a keyword is not proof of relevance.`
        : `Not classified as a direct owner (current category: ${contact.roleCategory.replace(/_/g, ' ').toLowerCase()}).`,
  });

  const operationalOwner =
    contact.roleCategory === RoleCategory.OPERATIONAL_OWNER ||
    (contact.roleCategory === RoleCategory.DIRECT_OWNER &&
      (!!affinity.departmentMatch || !!affinity.functionMatch)) ||
    (contact.roleCategory === RoleCategory.BUSINESS_INFLUENCER && contact.influencesDecision) ||
    (contact.roleCategory === RoleCategory.EXECUTIVE_SPONSOR && contact.ownsBudget);
  roleRelevance += add({
    component: 'B_ROLE',
    code: 'role.operational',
    label: 'Operational owner or strong business influencer',
    points: operationalOwner ? rw.operationalOwnerOrInfluencer : 0,
    max: rw.operationalOwnerOrInfluencer,
    reason: operationalOwner
      ? affinity.departmentMatch
        ? `Runs the function day to day (department: ${contact.department}).`
        : `Recorded as an operational owner or strong influencer for this problem.`
      : 'Not an operational owner of this problem.',
  });

  const senioritySpecified = campaign.targetSeniorities.length > 0;
  const seniorityHit = senioritySpecified
    ? campaign.targetSeniorities.includes(contact.seniority)
    : isLeadership(contact.seniority);
  roleRelevance += add({
    component: 'B_ROLE',
    code: 'role.seniority',
    label: 'Relevant seniority',
    points: seniorityHit ? rw.seniority : 0,
    max: rw.seniority,
    reason: seniorityHit
      ? `${contact.seniority.replace(/_/g, ' ').toLowerCase()} is the right level for this campaign.`
      : `${contact.seniority.replace(/_/g, ' ').toLowerCase()} is not a target seniority. Seniority alone never qualifies a contact.`,
  });

  const budgetPoints = contact.ownsBudget
    ? rw.budgetOrDecisionInfluence
    : contact.influencesDecision
      ? Math.max(0, rw.budgetOrDecisionInfluence - 1)
      : 0;
  roleRelevance += add({
    component: 'B_ROLE',
    code: 'role.budget',
    label: 'Budget or decision influence',
    points: budgetPoints,
    max: rw.budgetOrDecisionInfluence,
    reason: contact.ownsBudget
      ? 'Owns the budget for this area.'
      : contact.influencesDecision
        ? `Influences the decision as ${contact.decisionRole.replace(/_/g, ' ').toLowerCase()}.`
        : 'No budget authority or decision influence recorded.',
  });

  // ------------------------------------------------------------ C: trigger
  const tw = weights.trigger;
  let trigger = 0;
  const triggersDiscounted = account.triggerVerification === TriggerVerification.FALSE_POSITIVE;
  const triggerNote = triggersDiscounted
    ? ' (withheld: trigger marked false during research review)'
    : account.triggerVerification === TriggerVerification.UNVERIFIED
      ? ' (unverified - flagged for research review)'
      : '';
  const t = (condition: boolean, points: number) => (condition && !triggersDiscounted ? points : 0);

  const hiringPoints = triggersDiscounted
    ? 0
    : account.relevantOpenJobPostings >= 3
      ? tw.hiring
      : account.relevantOpenJobPostings > 0
        ? Math.max(0, tw.hiring - 2)
        : 0;
  trigger += add({
    component: 'C_TRIGGER',
    code: 'trigger.hiring',
    label: 'Relevant hiring activity',
    points: hiringPoints,
    max: tw.hiring,
    reason: account.relevantOpenJobPostings
      ? `${account.relevantOpenJobPostings} relevant open role${account.relevantOpenJobPostings > 1 ? 's' : ''}${triggerNote}.`
      : 'No relevant open roles found.',
  });

  trigger += add({
    component: 'C_TRIGGER',
    code: 'trigger.transformation',
    label: 'Active transformation or implementation project',
    points: t(account.transformationActivity, tw.transformation),
    max: tw.transformation,
    reason: account.transformationActivity
      ? `Active transformation or implementation programme${triggerNote}.`
      : 'No transformation activity recorded.',
  });

  const expansion = account.expansionActivity || account.mergerOrAcquisitionActivity;
  trigger += add({
    component: 'C_TRIGGER',
    code: 'trigger.expansion',
    label: 'Expansion, merger, or restructuring',
    points: t(expansion, tw.expansionOrMerger),
    max: tw.expansionOrMerger,
    reason: expansion
      ? `${account.mergerOrAcquisitionActivity ? 'Merger or acquisition' : 'Expansion'} activity recorded${triggerNote}.`
      : 'No expansion or merger activity recorded.',
  });

  trigger += add({
    component: 'C_TRIGGER',
    code: 'trigger.leadership',
    label: 'Relevant leadership change',
    points: t(account.leadershipChange, tw.leadershipChange),
    max: tw.leadershipChange,
    reason: account.leadershipChange
      ? `New leadership in the relevant function${triggerNote}.`
      : 'No relevant leadership change.',
  });

  trigger += add({
    component: 'C_TRIGGER',
    code: 'trigger.regulatory',
    label: 'Regulatory or operational pressure',
    points: t(account.regulatoryPressure, tw.regulatoryPressure),
    max: tw.regulatoryPressure,
    reason: account.regulatoryPressure
      ? `Regulatory or operational pressure recorded${triggerNote}.`
      : 'No regulatory or operational pressure recorded.',
  });

  trigger += add({
    component: 'C_TRIGGER',
    code: 'trigger.statedPriority',
    label: 'Publicly stated priority or problem',
    points: t(account.publiclyStatedPriority, tw.statedPriority),
    max: tw.statedPriority,
    reason: account.publiclyStatedPriority
      ? `Publicly stated priority: ${account.recentBusinessTrigger ?? 'see account notes'}${triggerNote}.`
      : 'No publicly stated priority found.',
  });

  // --------------------------------------------------------- D: engagement
  const ew = weights.engagement;
  let engagement = 0;
  const eventTypes = new Set(events.map((e) => e.eventType));
  const has = (...types: EventType[]) => types.some((type) => eventTypes.has(type));

  engagement += add({
    component: 'D_ENGAGEMENT',
    code: 'engagement.reply',
    label: 'Positive email reply',
    points: has(EventType.POSITIVE_EMAIL_REPLY) ? ew.positiveEmailReply : 0,
    max: ew.positiveEmailReply,
    reason: has(EventType.POSITIVE_EMAIL_REPLY)
      ? 'Replied positively to a campaign email.'
      : 'No positive email reply recorded.',
  });
  engagement += add({
    component: 'D_ENGAGEMENT',
    code: 'engagement.whitepaper',
    label: 'White-paper download',
    points: has(EventType.WHITEPAPER_DOWNLOADED) ? ew.whitepaperDownload : 0,
    max: ew.whitepaperDownload,
    reason: has(EventType.WHITEPAPER_DOWNLOADED)
      ? 'Downloaded the campaign white paper.'
      : 'No white-paper download recorded.',
  });
  engagement += add({
    component: 'D_ENGAGEMENT',
    code: 'engagement.registration',
    label: 'Webinar registration',
    points: has(EventType.WEBINAR_REGISTERED) ? ew.webinarRegistration : 0,
    max: ew.webinarRegistration,
    reason: has(EventType.WEBINAR_REGISTERED)
      ? 'Registered for the webinar.'
      : 'Not registered for the webinar.',
  });
  engagement += add({
    component: 'D_ENGAGEMENT',
    code: 'engagement.click',
    label: 'Relevant resource click',
    points: has(EventType.EMAIL_CLICKED, EventType.CTA_CLICKED, EventType.RESOURCE_DOWNLOADED)
      ? ew.resourceClick
      : 0,
    max: ew.resourceClick,
    reason: has(EventType.EMAIL_CLICKED, EventType.CTA_CLICKED, EventType.RESOURCE_DOWNLOADED)
      ? 'Clicked a campaign link or downloaded a resource.'
      : 'No resource clicks recorded.',
  });
  engagement += add({
    component: 'D_ENGAGEMENT',
    code: 'engagement.history',
    label: 'Previous attendance or meeting',
    points: has(
      EventType.WEBINAR_ATTENDED,
      EventType.REPLAY_WATCHED,
      EventType.MEETING_REQUESTED,
    )
      ? ew.previousAttendanceOrMeeting
      : 0,
    max: ew.previousAttendanceOrMeeting,
    reason: has(EventType.WEBINAR_ATTENDED, EventType.REPLAY_WATCHED, EventType.MEETING_REQUESTED)
      ? 'Has previously attended an event or requested a meeting.'
      : 'No prior attendance or meeting.',
  });

  // -------------------------------------------------------- E: data quality
  const dw = weights.dataQuality;
  let dataQuality = 0;
  const titleVerified =
    contact.roleConfidence === DataConfidence.HIGH ||
    (contact.roleConfidence === DataConfidence.MEDIUM &&
      !!contact.lastVerifiedAt &&
      daysBetween(now, contact.lastVerifiedAt) <= STALE_AFTER_DAYS);
  dataQuality += add({
    component: 'E_DATA_QUALITY',
    code: 'dq.title',
    label: 'Current verified job title',
    points: titleVerified ? dw.verifiedTitle : 0,
    max: dw.verifiedTitle,
    reason: titleVerified
      ? `Job title verified (${contact.roleConfidence.toLowerCase()} confidence).`
      : `Job title not verified (${contact.roleConfidence.toLowerCase()} confidence).`,
  });

  const emailVerified =
    contact.emailStatus === EmailStatus.VERIFIED || contact.emailStatus === EmailStatus.VALID;
  const emailPoints = emailVerified
    ? dw.verifiedEmail
    : contact.emailStatus === EmailStatus.CATCH_ALL
      ? Math.max(0, dw.verifiedEmail - 1)
      : 0;
  dataQuality += add({
    component: 'E_DATA_QUALITY',
    code: 'dq.email',
    label: 'Verified work email',
    points: emailPoints,
    max: dw.verifiedEmail,
    reason: `Email status: ${contact.emailStatus.replace(/_/g, ' ').toLowerCase()}.`,
  });

  const phoneValid =
    contact.phoneStatus === PhoneStatus.VERIFIED || contact.phoneStatus === PhoneStatus.VALID;
  dataQuality += add({
    component: 'E_DATA_QUALITY',
    code: 'dq.phone',
    label: 'Valid phone number',
    points: phoneValid ? dw.validPhone : 0,
    max: dw.validPhone,
    reason: phoneValid
      ? `Phone status: ${contact.phoneStatus.toLowerCase()}.`
      : `Phone status: ${contact.phoneStatus.replace(/_/g, ' ').toLowerCase()} - qualify and nurture by email instead.`,
  });

  const geoComplete = !!contact.country && !!contact.timeZone;
  dataQuality += add({
    component: 'E_DATA_QUALITY',
    code: 'dq.geo',
    label: 'Correct country and time zone',
    points: geoComplete ? dw.countryAndTimeZone : 0,
    max: dw.countryAndTimeZone,
    reason: geoComplete
      ? `${contact.country} / ${contact.timeZone}.`
      : 'Country or time zone missing - local calling time cannot be computed.',
  });
  dataQuality += add({
    component: 'E_DATA_QUALITY',
    code: 'dq.source',
    label: 'Contact source recorded',
    points: contact.contactSource ? dw.contactSource : 0,
    max: dw.contactSource,
    reason: contact.contactSource ? `Source: ${contact.contactSource}.` : 'No contact source recorded.',
  });
  dataQuality += add({
    component: 'E_DATA_QUALITY',
    code: 'dq.verified',
    label: 'Last verification date recorded',
    points: contact.lastVerifiedAt ? dw.lastVerified : 0,
    max: dw.lastVerified,
    reason: contact.lastVerifiedAt
      ? `Last verified ${daysBetween(now, contact.lastVerifiedAt)} days ago.`
      : 'Never verified.',
  });
  const consentRecorded = contact.consentStatus !== 'NOT_CAPTURED';
  dataQuality += add({
    component: 'E_DATA_QUALITY',
    code: 'dq.consent',
    label: 'Consent or permitted-outreach status recorded',
    points: consentRecorded ? dw.consentRecorded : 0,
    max: dw.consentRecorded,
    reason: consentRecorded
      ? `Consent status: ${contact.consentStatus.replace(/_/g, ' ').toLowerCase()}.`
      : 'No consent status captured.',
  });

  // --------------------------------------------------------- F: attendance
  const aw = weights.attendance;
  let attendance = 0;
  const attendedBefore = has(EventType.WEBINAR_ATTENDED, EventType.REPLAY_WATCHED);
  attendance += add({
    component: 'F_ATTENDANCE',
    code: 'attend.previous',
    label: 'Previous event attendance',
    points: attendedBefore ? aw.previousAttendance : 0,
    max: aw.previousAttendance,
    reason: attendedBefore
      ? 'Attended a previous event or watched a replay.'
      : 'No previous attendance.',
  });

  const registration = events.find((e) => e.eventType === EventType.WEBINAR_REGISTERED);
  const earlyRegistration =
    !!registration &&
    !!campaign.eventDate &&
    daysBetween(campaign.eventDate, registration.eventDate) >= EARLY_REGISTRATION_DAYS &&
    registration.eventDate < campaign.eventDate;
  attendance += add({
    component: 'F_ATTENDANCE',
    code: 'attend.early',
    label: 'Early registration',
    points: earlyRegistration ? aw.earlyRegistration : 0,
    max: aw.earlyRegistration,
    reason: earlyRegistration
      ? `Registered ${daysBetween(campaign.eventDate!, registration!.eventDate)} days before the event.`
      : registration
        ? 'Registered close to the event date.'
        : 'Not registered.',
  });

  const eventLocalHour = campaign.eventDate ? localHour(campaign.eventDate, contact.timeZone) : null;
  const convenient =
    eventLocalHour !== null &&
    eventLocalHour >= CONVENIENT_LOCAL_HOUR_START &&
    eventLocalHour <= CONVENIENT_LOCAL_HOUR_END;
  attendance += add({
    component: 'F_ATTENDANCE',
    code: 'attend.localTime',
    label: 'Convenient local event time',
    points: convenient ? aw.convenientLocalTime : 0,
    max: aw.convenientLocalTime,
    reason:
      eventLocalHour === null
        ? 'Local event time unknown (no time zone on the contact).'
        : convenient
          ? `Event starts at ${String(eventLocalHour).padStart(2, '0')}:00 local time.`
          : `Event starts at ${String(eventLocalHour).padStart(2, '0')}:00 local time - outside working hours.`,
  });

  const explicitRequest = events.some(
    (e) =>
      (e.metadata as Record<string, unknown> | null | undefined)?.explicitRequest === true ||
      e.eventType === EventType.MEETING_REQUESTED,
  );
  attendance += add({
    component: 'F_ATTENDANCE',
    code: 'attend.request',
    label: 'Explicit request for the link or reminder',
    points: explicitRequest ? aw.explicitLinkRequest : 0,
    max: aw.explicitLinkRequest,
    reason: explicitRequest
      ? 'Explicitly asked for the link, a reminder, or a meeting.'
      : 'No explicit request recorded.',
  });

  // ------------------------------------------------------------- totals
  const components = { fit, roleRelevance, trigger, engagement, dataQuality, attendance };
  const baseTotal = fit + roleRelevance + trigger + engagement + dataQuality + attendance;
  const { bonus } = calculateEngagementBonus(events);
  const totalScore = Math.min(MAX_TOTAL_SCORE, baseTotal + bonus);

  // ------------------------------------------------------------- gates
  const relevance = evaluateRelevanceGate({ account, contact, campaign, compliance, now });

  // ------------------------------------------------------------ priority
  const priorityReasons: string[] = [];
  let priority: Priority;

  if (compliance.outcome === 'BLOCK') {
    priority = Priority.REJECT;
    priorityReasons.push('Compliance gate blocked outreach (opt-out or do-not-contact).');
  } else if (contact.isDuplicate) {
    priority = Priority.REJECT;
    priorityReasons.push('Record is a duplicate of an existing contact.');
  } else if (!relevance.roleEligibleForP1 && !relevance.passed && totalScore < P3_SCORE_THRESHOLD) {
    priority = Priority.REJECT;
    priorityReasons.push('Role is not relevant to the campaign problem and the score is below 40.');
  } else if (compliance.outcome === 'HOLD') {
    priority = Priority.COMPLIANCE_HOLD;
    priorityReasons.push(
      `Compliance information is incomplete: ${compliance.missingFields.join(', ') || 'no permitted channel'}.`,
    );
  } else if (!relevance.passed) {
    priority = Priority.REJECT;
    priorityReasons.push(`Relevance gate failed: ${relevance.failures.join('; ')}.`);
  } else if (totalScore < P3_SCORE_THRESHOLD) {
    priority = Priority.REJECT;
    priorityReasons.push(`Total score ${totalScore} is below the minimum of ${P3_SCORE_THRESHOLD}.`);
  } else if (totalScore >= P1_SCORE_THRESHOLD) {
    const roleOk = components.roleRelevance >= P1_MIN_ROLE_RELEVANCE;
    const dqOk = components.dataQuality >= P1_MIN_DATA_QUALITY;
    const hasWhy = !!whyThisContact && whyThisContact.trim().length > 0;
    if (roleOk && dqOk && relevance.roleEligibleForP1 && hasWhy) {
      priority = Priority.P1;
      priorityReasons.push(
        `Score ${totalScore} with role relevance ${components.roleRelevance}/${P1_MIN_ROLE_RELEVANCE} and data quality ${components.dataQuality}/${P1_MIN_DATA_QUALITY}; both gates passed.`,
      );
    } else {
      priority = Priority.P2;
      if (!roleOk)
        priorityReasons.push(
          `Held at P2: role relevance ${components.roleRelevance} is below the P1 minimum of ${P1_MIN_ROLE_RELEVANCE}. A high total score cannot substitute for genuine problem ownership.`,
        );
      if (!dqOk)
        priorityReasons.push(
          `Held at P2: data quality ${components.dataQuality} is below the P1 minimum of ${P1_MIN_DATA_QUALITY}.`,
        );
      if (!relevance.roleEligibleForP1)
        priorityReasons.push('Held at P2: role is not a direct or indirect owner of the problem.');
      if (!hasWhy)
        priorityReasons.push(
          'Held at P2: P1 requires a written "why this contact" justification from a researcher.',
        );
    }
  } else if (totalScore >= P2_SCORE_THRESHOLD) {
    priority = Priority.P2;
    priorityReasons.push(`Total score ${totalScore} falls in the P2 band (60-79).`);
  } else {
    priority = Priority.P3;
    priorityReasons.push(`Total score ${totalScore} falls in the P3 band (40-59).`);
  }

  // -------------------------------------------------------- human review
  const humanReviewReasons: string[] = [];
  if (contact.roleCategory === RoleCategory.UNKNOWN)
    humanReviewReasons.push('Role category is unknown.');
  if (contact.roleConfidence === DataConfidence.LOW || contact.roleConfidence === DataConfidence.UNVERIFIED)
    humanReviewReasons.push('Role confidence is low or unverified.');
  if (
    totalScore >= P1_SCORE_THRESHOLD - NEAR_P1_BAND &&
    totalScore < P1_SCORE_THRESHOLD &&
    priority !== Priority.P1
  )
    humanReviewReasons.push(`Score ${totalScore} is within ${NEAR_P1_BAND} points of the P1 threshold.`);
  if (priority === Priority.P1 && !whyThisContact)
    humanReviewReasons.push('P1 requires a written justification.');
  if (
    account.triggerVerification === TriggerVerification.UNVERIFIED &&
    trigger > 0
  )
    humanReviewReasons.push('A business trigger was found but has not been verified.');
  if (account.accountDataConfidence === DataConfidence.LOW)
    humanReviewReasons.push('Account data confidence is low - company and contact data may conflict.');
  if (compliance.outcome === 'HOLD') humanReviewReasons.push('Compliance record is incomplete.');
  if (
    totalScore >= P1_SCORE_THRESHOLD &&
    components.roleRelevance < P1_MIN_ROLE_RELEVANCE &&
    affinity.weakTitleMatches.length > 0
  )
    humanReviewReasons.push(
      'High score driven by fit rather than role ownership, with only an ambiguous title keyword.',
    );

  // ------------------------------------------------------------ playbook
  const topTrigger = pickTopTrigger(account);
  const playbook = buildPlaybook({ account, contact, campaign, compliance, priority, topTrigger });

  // ----------------------------------------------- old-method comparison
  const surfaceLevelMatch =
    (campaign.targetIndustries.length === 0 || industryHit) &&
    (campaign.targetCountries.length === 0 || countryHit) &&
    (campaign.surfaceTitleKeywords.length === 0 ||
      campaign.surfaceTitleKeywords.some((keyword) =>
        contact.normalizedJobTitle.includes(keyword.toLowerCase()),
      ));

  return {
    components,
    baseTotal,
    engagementBonus: bonus,
    totalScore,
    priority,
    priorityReasons,
    explanation: lines,
    relevance,
    compliance,
    humanReviewRequired: humanReviewReasons.length > 0,
    humanReviewReasons,
    playbook,
    surfaceLevelMatch,
  };
}

function describeAffinity(affinity: ReturnType<typeof assessProblemAffinity>): string {
  const parts: string[] = [];
  if (affinity.strongTitleMatches.length) parts.push(`title: ${affinity.strongTitleMatches.join(', ')}`);
  if (affinity.departmentMatch) parts.push(`department: ${affinity.departmentMatch}`);
  if (affinity.functionMatch) parts.push(`function: ${affinity.functionMatch}`);
  return parts.join('; ') || 'recorded responsibility';
}

/** The single most compelling trigger to lead an outreach message with. */
export function pickTopTrigger(account: AccountInput): string | null {
  if (account.triggerVerification === TriggerVerification.FALSE_POSITIVE) return null;
  if (account.recentBusinessTrigger) return account.recentBusinessTrigger;
  if (account.transformationActivity) return 'an active transformation programme';
  if (account.mergerOrAcquisitionActivity) return 'recent merger or acquisition activity';
  if (account.expansionActivity) return 'current expansion activity';
  if (account.relevantOpenJobPostings > 0)
    return `${account.relevantOpenJobPostings} relevant open roles`;
  if (account.regulatoryPressure) return 'regulatory pressure in your sector';
  if (account.leadershipChange) return 'a recent leadership change';
  return null;
}

/** Convenience for the UI: group explanation lines by component. */
export function groupExplanation(lines: ScoreLine[]) {
  const groups: Record<string, ScoreLine[]> = {};
  for (const line of lines) {
    (groups[line.component] ??= []).push(line);
  }
  return groups;
}
