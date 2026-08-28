/**
 * The SIGNAL scoring engine.
 *
 * Every point awarded carries the evidence that produced it and the record
 * fields that evidence came from. Nothing in the UI ever displays a number this
 * module cannot explain.
 *
 * Company fit answers "should we ever talk to this company".
 * Role relevance answers "does this person own the problem".
 * Trigger answers "is something happening now".
 * Engagement answers "have they shown intent".
 * Data quality answers "can we actually reach them".
 * Attendance likelihood answers "will they turn up" - which is deliberately
 * kept separate from commercial importance.
 */
import { computeEngagementBonus, hasEvent } from './engagement';
import { daysBetween, listIncludes } from './normalize';
import { resolveCountry } from './countries';
import { STALE_REVIEW_DAYS } from './relevance-gate';
import { DEFAULT_WEIGHTS } from './weights';
import type { RelevanceGateOutput } from './relevance-gate';
import type {
  Account,
  BandResult,
  Campaign,
  ComplianceResult,
  Contact,
  EngagementEvent,
  ScoreAward,
  ScoreBand,
  ScoreBreakdown,
  ScoringWeights,
} from './types';
import { SCORE_BAND_LABELS } from './types';

export interface ScoringInput {
  account: Account;
  contact: Contact;
  campaign: Campaign;
  /** Engagement events for this contact on this campaign. */
  events: EngagementEvent[];
  /** Events for this contact on other campaigns, used for prior-attendance credit. */
  historicalEvents?: EngagementEvent[];
  compliance: ComplianceResult;
  gate: RelevanceGateOutput;
  weights?: ScoringWeights;
  now?: Date;
}

/** Local hour of an instant in a given IANA time zone, or null if unknown. */
export function localHourFor(instant: Date, timeZone: string | null | undefined): number | null {
  if (!timeZone) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone, hour: '2-digit', hour12: false,
    });
    const value = Number.parseInt(formatter.format(instant), 10);
    return Number.isNaN(value) ? null : value;
  } catch {
    return null;
  }
}

/** Formatted local date and time for a contact, used across the outreach UI. */
export function localTimeFor(instant: Date, timeZone: string | null | undefined): string | null {
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone, dateStyle: 'medium', timeStyle: 'short',
    }).format(instant);
  } catch {
    return null;
  }
}

interface AwardContext {
  weights: ScoringWeights;
  awards: ScoreAward[];
}

function award(
  context: AwardContext,
  band: ScoreBand,
  code: string,
  label: string,
  earned: boolean,
  evidence: string,
  sourceFields: string[],
  partial?: number,
): void {
  const maxPoints = context.weights.componentMax[code] ?? 0;
  const points = earned ? Math.min(partial ?? maxPoints, maxPoints) : 0;
  context.awards.push({ code, band, label, points, maxPoints, awarded: points > 0, evidence, sourceFields });
}

function bandResult(band: ScoreBand, awards: ScoreAward[], weights: ScoringWeights): BandResult {
  const bandAwards = awards.filter((item) => item.band === band);
  const raw = bandAwards.reduce((sum, item) => sum + item.points, 0);
  const max = weights.bandMax[band];
  return {
    band,
    label: SCORE_BAND_LABELS[band],
    score: Math.min(raw, max),
    max,
    awards: bandAwards,
  };
}

export interface ScoreResult {
  breakdown: ScoreBreakdown;
  fitScore: number;
  roleRelevanceScore: number;
  triggerScore: number;
  engagementScore: number;
  dataQualityScore: number;
  attendanceLikelihoodScore: number;
  engagementBonusScore: number;
  totalScore: number;
}

/**
 * Score one contact against one campaign.
 * The relevance gate result is an input, not a side effect: role points can
 * only be awarded from the ownership facts the gate already established.
 */
export function computeScore(input: ScoringInput): ScoreResult {
  const weights = input.weights ?? DEFAULT_WEIGHTS;
  const now = input.now ?? new Date();
  const { account, contact, campaign, events, gate, compliance } = input;
  const historical = input.historicalEvents ?? [];
  const context: AwardContext = { weights, awards: [] };

  // ---------------------------------------------------------------- band A
  const industryMatch = listIncludes(campaign.targetIndustries, account.industry);
  const subIndustryMatch = listIncludes(campaign.targetSubIndustries, account.subIndustry);
  const noIndustryTargeting = campaign.targetIndustries.length === 0;
  award(
    context, 'A', 'A_INDUSTRY', 'Target industry match',
    industryMatch || subIndustryMatch || noIndustryTargeting,
    noIndustryTargeting
      ? 'The campaign does not restrict industry, so every account qualifies on this component.'
      : industryMatch
        ? `Industry "${account.industry}" is a campaign target.`
        : subIndustryMatch
          ? `Sub-industry "${account.subIndustry}" is a campaign target.`
          : `Industry "${account.industry}" is not among the campaign targets.`,
    ['account.industry', 'account.subIndustry', 'campaign.targetIndustries'],
  );

  const countryMatch = campaign.targetCountries.length === 0 || listIncludes(campaign.targetCountries, account.country);
  award(
    context, 'A', 'A_GEOGRAPHY', 'Target geography match',
    countryMatch,
    campaign.targetCountries.length === 0
      ? 'The campaign does not restrict geography.'
      : countryMatch
        ? `${account.country}${account.city ? `, ${account.city}` : ''} is inside the campaign geography.`
        : `${account.country} is outside the campaign geography.`,
    ['account.country', 'campaign.targetCountries'],
  );

  const employeeMatch = campaign.targetEmployeeBands.length > 0
    && campaign.targetEmployeeBands.includes(account.employeeBand);
  const revenueMatch = campaign.targetRevenueBands.length > 0
    && campaign.targetRevenueBands.includes(account.revenueBand);
  const noSizeTargeting = campaign.targetEmployeeBands.length === 0 && campaign.targetRevenueBands.length === 0;
  award(
    context, 'A', 'A_SIZE_BAND', 'Target employee or revenue band',
    employeeMatch || revenueMatch || noSizeTargeting,
    noSizeTargeting
      ? 'The campaign does not restrict company size.'
      : employeeMatch && revenueMatch
        ? 'Both the employee band and the revenue band are campaign targets.'
        : employeeMatch
          ? `Employee band ${account.employeeBand} is a campaign target.`
          : revenueMatch
            ? `Revenue band ${account.revenueBand} is a campaign target.`
            : `Neither the employee band (${account.employeeBand}) nor the revenue band (${account.revenueBand}) is a campaign target.`,
    ['account.employeeBand', 'account.revenueBand', 'campaign.targetEmployeeBands', 'campaign.targetRevenueBands'],
  );

  const targetTech = campaign.targetTechnologies.map((value) => value.toLowerCase());
  const ownedTech = account.existingTechnology.filter((value) => targetTech.includes(value.toLowerCase()));
  const competitorTech = account.competitorTechnology.filter((value) => targetTech.includes(value.toLowerCase()));
  award(
    context, 'A', 'A_TECHNOLOGY', 'Relevant technology or business model',
    ownedTech.length > 0 || competitorTech.length > 0,
    ownedTech.length > 0
      ? `Runs ${ownedTech.join(', ')}, which the campaign targets.`
      : competitorTech.length > 0
        ? `Runs competing technology ${competitorTech.join(', ')}, which the campaign targets for displacement.`
        : campaign.targetTechnologies.length === 0
          ? 'The campaign does not target a technology stack.'
          : 'No overlap between the account stack and the campaign target technologies.',
    ['account.existingTechnology', 'account.competitorTechnology', 'campaign.targetTechnologies'],
  );

  const strategicRelationship = ['CURRENT_CLIENT', 'PAST_CLIENT', 'PARTNER'].includes(account.existingClientRelationship);
  award(
    context, 'A', 'A_NAMED_ACCOUNT', 'Named strategic account or existing relationship',
    account.namedAccountStatus || strategicRelationship,
    account.namedAccountStatus && strategicRelationship
      ? `Named strategic account and an existing ${account.existingClientRelationship.toLowerCase().replace('_', ' ')} relationship.`
      : account.namedAccountStatus
        ? 'Flagged as a named strategic account.'
        : strategicRelationship
          ? `Existing ${account.existingClientRelationship.toLowerCase().replace('_', ' ')} relationship.`
          : 'Not a named account and no existing relationship.',
    ['account.namedAccountStatus', 'account.existingClientRelationship'],
  );

  // ---------------------------------------------------------------- band B
  const relevance = gate.relevance;
  award(
    context, 'B', 'B_DIRECT_OWNER', 'Direct owner of the campaign problem',
    relevance.directOwnership,
    relevance.directOwnership
      ? `Classified a direct owner with confirmed responsibility, in a matching function. ${relevance.explanation}`
      : relevance.keywordTrap
        ? `Not a direct owner. ${relevance.rejectedSignals[0] ?? relevance.explanation}`
        : `Not a direct owner. ${relevance.explanation}`,
    ['contact.roleCategory', 'contact.directProblemResponsibility', 'contact.normalizedJobTitle', 'contact.department'],
  );

  award(
    context, 'B', 'B_OPERATIONAL_OWNER', 'Operational owner or strong business influencer',
    relevance.operationalOwnership,
    relevance.operationalOwnership
      ? 'Runs the function day to day, or demonstrably shapes the decision.'
      : 'No evidence of operational ownership or strong influence over this problem.',
    ['contact.roleCategory', 'contact.influencesDecision', 'contact.ownsBudget'],
  );

  award(
    context, 'B', 'B_SENIORITY', 'Relevant seniority',
    relevance.seniorityRelevant,
    relevance.seniorityRelevant
      ? `Seniority ${contact.seniority} is inside the campaign target range.`
      : `Seniority ${contact.seniority} is outside the campaign target range.`,
    ['contact.seniority', 'campaign.targetSeniorities'],
  );

  award(
    context, 'B', 'B_BUDGET_INFLUENCE', 'Budget or decision influence',
    contact.ownsBudget || contact.influencesDecision,
    contact.ownsBudget
      ? 'Owns budget for this area.'
      : contact.influencesDecision
        ? 'Influences the buying decision without owning budget.'
        : 'No recorded budget ownership or decision influence.',
    ['contact.ownsBudget', 'contact.influencesDecision', 'contact.decisionRole'],
  );

  // ---------------------------------------------------------------- band C
  const triggerDiscounted = account.triggerVerification === 'FALSE_POSITIVE';

  award(
    context, 'C', 'C_HIRING', 'Relevant hiring activity',
    account.relevantOpenJobPostings > 0,
    account.relevantOpenJobPostings > 0
      ? `${account.relevantOpenJobPostings} relevant open role${account.relevantOpenJobPostings === 1 ? '' : 's'} found.`
      : 'No relevant open roles found.',
    ['account.relevantOpenJobPostings'],
  );

  award(
    context, 'C', 'C_TRANSFORMATION', 'Active transformation or implementation project',
    account.transformationActivity,
    account.transformationActivity
      ? `Transformation activity on record${account.recentBusinessTrigger ? `: ${account.recentBusinessTrigger}` : '.'}`
      : 'No active transformation or implementation programme on record.',
    ['account.transformationActivity', 'account.recentBusinessTrigger'],
  );

  award(
    context, 'C', 'C_EXPANSION_MA', 'Expansion, merger or restructuring',
    account.expansionActivity || account.mergerOrAcquisitionActivity,
    account.mergerOrAcquisitionActivity
      ? 'Merger or acquisition activity on record.'
      : account.expansionActivity
        ? 'Expansion or restructuring activity on record.'
        : 'No expansion, merger or restructuring activity on record.',
    ['account.expansionActivity', 'account.mergerOrAcquisitionActivity'],
  );

  award(
    context, 'C', 'C_LEADERSHIP_CHANGE', 'Relevant leadership change',
    account.leadershipChange,
    account.leadershipChange
      ? 'A relevant leadership change has been recorded.'
      : 'No relevant leadership change on record.',
    ['account.leadershipChange'],
  );

  award(
    context, 'C', 'C_REGULATORY', 'Regulatory or operational pressure',
    account.regulatoryPressure,
    account.regulatoryPressure
      ? 'Regulatory or operational pressure recorded for this account.'
      : 'No regulatory or operational pressure on record.',
    ['account.regulatoryPressure'],
  );

  const statedPriority = Boolean(account.publiclyStatedPriority) && !triggerDiscounted;
  award(
    context, 'C', 'C_STATED_PRIORITY', 'Publicly stated priority or problem',
    statedPriority,
    statedPriority
      ? `Publicly stated: "${account.publiclyStatedPriority}".`
      : triggerDiscounted
        ? 'A stated priority was recorded but a researcher marked the trigger a false positive.'
        : 'No publicly stated priority on record.',
    ['account.publiclyStatedPriority', 'account.triggerVerification'],
  );

  // ---------------------------------------------------------------- band D
  const positiveReply = hasEvent(events, 'POSITIVE_EMAIL_REPLY');
  award(
    context, 'D', 'D_POSITIVE_REPLY', 'Positive email reply',
    positiveReply,
    positiveReply ? 'Replied positively to campaign outreach.' : 'No positive reply recorded.',
    ['engagementEvent.POSITIVE_EMAIL_REPLY'],
  );

  const downloaded = hasEvent(events, 'WHITEPAPER_DOWNLOADED');
  award(
    context, 'D', 'D_WHITEPAPER_DOWNLOAD', 'White-paper download',
    downloaded,
    downloaded ? 'Downloaded the campaign white paper.' : 'No white-paper download recorded.',
    ['engagementEvent.WHITEPAPER_DOWNLOADED'],
  );

  const registered = hasEvent(events, 'WEBINAR_REGISTERED');
  award(
    context, 'D', 'D_WEBINAR_REGISTRATION', 'Webinar registration',
    registered,
    registered ? 'Registered for the webinar.' : 'Not registered for the webinar.',
    ['engagementEvent.WEBINAR_REGISTERED'],
  );

  const clicked = hasEvent(events, 'EMAIL_CLICKED', 'CTA_CLICKED', 'WHITEPAPER_OPENED');
  award(
    context, 'D', 'D_RESOURCE_CLICK', 'Relevant resource click',
    clicked,
    clicked ? 'Clicked a campaign resource or call to action.' : 'No resource click recorded.',
    ['engagementEvent.EMAIL_CLICKED', 'engagementEvent.CTA_CLICKED'],
  );

  const priorEngagement = hasEvent(historical, 'WEBINAR_ATTENDED', 'MEETING_REQUESTED');
  award(
    context, 'D', 'D_PRIOR_ENGAGEMENT', 'Previous attendance or meeting',
    priorEngagement,
    priorEngagement
      ? 'Attended a previous event or took a meeting on an earlier campaign.'
      : 'No previous attendance or meeting on record.',
    ['engagementEvent.history'],
  );

  // ---------------------------------------------------------------- band E
  const verifiedAgeDays = contact.lastVerifiedAt ? daysBetween(contact.lastVerifiedAt, now) : null;
  const titleVerified = contact.normalizedJobTitle.length > 0
    && verifiedAgeDays !== null
    && verifiedAgeDays <= STALE_REVIEW_DAYS * 2;
  award(
    context, 'E', 'E_VERIFIED_TITLE', 'Current verified job title',
    titleVerified,
    titleVerified
      ? `Title verified ${verifiedAgeDays} days ago.`
      : verifiedAgeDays === null
        ? 'No verification date, so the title cannot be treated as current.'
        : `Title last verified ${verifiedAgeDays} days ago, outside the freshness window.`,
    ['contact.jobTitle', 'contact.lastVerifiedAt'],
  );

  const emailOk = contact.emailStatus === 'VERIFIED' || contact.emailStatus === 'VALID';
  award(
    context, 'E', 'E_VERIFIED_EMAIL', 'Verified work email',
    emailOk,
    emailOk ? `Work email status is ${contact.emailStatus}.` : `Work email status is ${contact.emailStatus}.`,
    ['contact.workEmail', 'contact.emailStatus'],
  );

  const phoneOk = contact.phoneStatus === 'VERIFIED' || contact.phoneStatus === 'VALID';
  award(
    context, 'E', 'E_VALID_PHONE', 'Valid phone number',
    phoneOk,
    phoneOk
      ? `Phone status is ${contact.phoneStatus}.`
      : `Phone status is ${contact.phoneStatus}. Email remains available as the qualification channel.`,
    ['contact.phoneNumber', 'contact.phoneStatus'],
  );

  const geoOk = resolveCountry(contact.country) !== null && Boolean(contact.timeZone);
  award(
    context, 'E', 'E_GEO_TIMEZONE', 'Correct country and time zone',
    geoOk,
    geoOk
      ? `${contact.country} resolved, time zone ${contact.timeZone}.`
      : 'Country could not be resolved to a known market, or no time zone is set.',
    ['contact.country', 'contact.timeZone'],
  );

  award(
    context, 'E', 'E_SOURCE_RECORDED', 'Contact source recorded',
    Boolean(contact.contactSource),
    contact.contactSource ? `Source: ${contact.contactSource}.` : 'No contact source recorded.',
    ['contact.contactSource'],
  );

  award(
    context, 'E', 'E_LAST_VERIFIED', 'Last verification date recorded',
    contact.lastVerifiedAt !== null,
    contact.lastVerifiedAt ? `Last verified ${contact.lastVerifiedAt.toISOString().slice(0, 10)}.` : 'No last-verified date recorded.',
    ['contact.lastVerifiedAt'],
  );

  const consentRecorded = contact.consentStatus !== 'NOT_CAPTURED';
  award(
    context, 'E', 'E_CONSENT_RECORDED', 'Consent or permitted-outreach status recorded',
    consentRecorded,
    consentRecorded
      ? `Consent status ${contact.consentStatus}. ${compliance.summary}`
      : 'No consent or permitted-outreach status recorded.',
    ['contact.consentStatus', 'complianceRecord'],
  );

  // ---------------------------------------------------------------- band F
  const priorAttendance = hasEvent(historical, 'WEBINAR_ATTENDED');
  award(
    context, 'F', 'F_PRIOR_ATTENDANCE', 'Previous event attendance',
    priorAttendance,
    priorAttendance ? 'Attended a previous webinar.' : 'No previous attendance on record.',
    ['engagementEvent.history'],
  );

  const registrationEvent = events.find((event) => event.eventType === 'WEBINAR_REGISTERED') ?? null;
  const earlyRegistration = Boolean(
    registrationEvent && campaign.eventDate
    && daysBetween(registrationEvent.eventDate, campaign.eventDate) >= 7,
  );
  award(
    context, 'F', 'F_EARLY_REGISTRATION', 'Early registration',
    earlyRegistration,
    earlyRegistration && registrationEvent && campaign.eventDate
      ? `Registered ${daysBetween(registrationEvent.eventDate, campaign.eventDate)} days before the event.`
      : registrationEvent
        ? 'Registered, but not far enough ahead to count as early.'
        : 'Not registered.',
    ['engagementEvent.WEBINAR_REGISTERED', 'campaign.eventDate'],
  );

  const localHour = campaign.eventDate ? localHourFor(campaign.eventDate, contact.timeZone) : null;
  const convenient = localHour !== null && localHour >= 8 && localHour <= 18;
  award(
    context, 'F', 'F_CONVENIENT_TIME', 'Convenient local event time',
    convenient,
    localHour === null
      ? 'Local event time could not be computed: no event date or no time zone.'
      : convenient
        ? `Event starts at ${String(localHour).padStart(2, '0')}:00 local time for this contact.`
        : `Event starts at ${String(localHour).padStart(2, '0')}:00 local time, outside working hours.`,
    ['campaign.eventDate', 'contact.timeZone'],
  );

  const explicitRequest = hasEvent(events, 'MEETING_REQUESTED', 'CALL_CALLBACK_REQUESTED')
    || events.some((event) => {
      const metadata = event.metadata as { explicitLinkRequest?: boolean } | null;
      return metadata?.explicitLinkRequest === true;
    });
  award(
    context, 'F', 'F_EXPLICIT_REQUEST', 'Explicit request for the link or reminder',
    explicitRequest,
    explicitRequest
      ? 'The contact asked for the joining link, a reminder or a callback.'
      : 'No explicit request for the link or a reminder.',
    ['engagementEvent.MEETING_REQUESTED', 'engagementEvent.metadata.explicitLinkRequest'],
  );

  // ------------------------------------------------------------- aggregate
  const bands: BandResult[] = (['A', 'B', 'C', 'D', 'E', 'F'] as ScoreBand[])
    .map((band) => bandResult(band, context.awards, weights));

  const baseScore = bands.reduce((sum, band) => sum + band.score, 0);
  const bonus = computeEngagementBonus(events);
  const uncapped = baseScore + bonus.points;
  const totalScore = Math.min(100, uncapped);

  const breakdown: ScoreBreakdown = {
    bands,
    baseScore,
    engagementBonus: bonus.points,
    engagementBonusDetail: bonus.entries,
    totalScore,
    cappedAt100: uncapped > 100,
    scoredAt: now.toISOString(),
  };

  const byBand = (band: ScoreBand) => bands.find((item) => item.band === band)?.score ?? 0;

  return {
    breakdown,
    fitScore: byBand('A'),
    roleRelevanceScore: byBand('B'),
    triggerScore: byBand('C'),
    engagementScore: byBand('D'),
    dataQualityScore: byBand('E'),
    attendanceLikelihoodScore: byBand('F'),
    engagementBonusScore: bonus.points,
    totalScore,
  };
}
