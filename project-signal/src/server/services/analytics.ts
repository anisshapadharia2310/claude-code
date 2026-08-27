/**
 * Campaign analytics.
 *
 * Every rate is computed from the event ledger, never stored, so a number on
 * the dashboard can always be traced back to the events that produced it.
 */
import type { Campaign, EngagementEvent, EventType, Priority } from '@prisma/client';
import { computeAccountSignal } from '@/domain/account-signal';
import { containsAnyTerm } from '@/domain/normalize';
import type { AccountSignal } from '@/domain/types';
import type { CampaignContactFull, SignalRepository } from '../repo/types';

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'COMPLIANCE_HOLD', 'REJECT', 'UNSCORED'];

export interface CampaignKpis {
  totalContacts: number;
  byPriority: Record<Priority, number>;
  dataQualityPassRate: number;
  relevanceGatePassRate: number;
  complianceGatePassRate: number;
  emailsSent: number;
  emailDeliveryRate: number;
  positiveReplyRate: number;
  registrations: number;
  webinarRegistrationRate: number;
  attendees: number;
  liveAttendanceRate: number;
  averageAttendanceDuration: number;
  meetingRequests: number;
  campaignCost: number | null;
  costPerVerifiedAttendee: number | null;
  currency: string;
  awaitingApproval: number;
  inReviewQueue: number;
}

export interface FunnelStage { stage: string; count: number; description: string }
export interface ScoreBucket { bucket: string; count: number }
export interface PriorityCount { priority: string; count: number; label: string }
export interface RegistrationByPriority { priority: string; registered: number; attended: number; contacts: number }
export interface EventsOverTime { date: string; events: number; registrations: number; attendance: number }
export interface AccountEngagementRow extends AccountSignal { topPriority: Priority }

export interface MethodComparisonRow {
  method: string;
  description: string;
  listSize: number;
  registrationRate: number;
  attendanceRate: number;
  positiveResponseRate: number;
  meetingRate: number;
  costPerVerifiedAttendee: number | null;
}

export interface CampaignAnalytics {
  campaign: Campaign;
  kpis: CampaignKpis;
  contactsByPriority: PriorityCount[];
  funnel: FunnelStage[];
  registrationByPriority: RegistrationByPriority[];
  scoreDistribution: ScoreBucket[];
  eventsOverTime: EventsOverTime[];
  accountEngagement: AccountEngagementRow[];
  methodComparison: MethodComparisonRow[];
}

const PRIORITY_LABELS: Record<Priority, string> = {
  P1: 'P1', P2: 'P2', P3: 'P3', REJECT: 'Reject', COMPLIANCE_HOLD: 'Hold', UNSCORED: 'Unscored',
};

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function countEvents(events: EngagementEvent[], type: EventType): number {
  return events.filter((event) => event.eventType === type).length;
}

/** Distinct contacts that produced at least one event of the given types. */
function contactsWith(events: EngagementEvent[], ...types: EventType[]): Set<string> {
  const set = new Set<string>();
  for (const event of events) if (types.includes(event.eventType)) set.add(event.contactId);
  return set;
}

/**
 * Estimated attendance depth per attendee, from the highest tier they reached.
 * A contact recorded only as "attended" is credited with 25%, which is the
 * conservative reading of a live join with no depth marker.
 */
function attendanceDepth(events: EngagementEvent[]): number[] {
  const byContact = new Map<string, number>();
  for (const event of events) {
    let depth: number | null = null;
    if (event.eventType === 'WEBINAR_ATTENDED') depth = 25;
    if (event.eventType === 'WEBINAR_ATTENDANCE_50_PERCENT') depth = 50;
    if (event.eventType === 'WEBINAR_ATTENDANCE_75_PERCENT') depth = 75;
    if (event.eventType === 'WEBINAR_ATTENDANCE_80_PERCENT') depth = 80;
    if (depth === null) continue;
    byContact.set(event.contactId, Math.max(byContact.get(event.contactId) ?? 0, depth));
  }
  return [...byContact.values()];
}

/**
 * The list the agency would have built with surface-level filtering: a keyword
 * in the raw job title, plus geography and industry. No ownership test.
 */
export function surfaceLevelList(rows: CampaignContactFull[], campaign: Campaign): CampaignContactFull[] {
  const terms = campaign.relevantTitleTerms.length > 0
    ? campaign.relevantTitleTerms
    : campaign.targetJobFunctions;
  return rows.filter((row) => {
    const account = row.contact.account;
    const geoOk = campaign.targetCountries.length === 0
      || campaign.targetCountries.includes(account.country);
    const industryOk = campaign.targetIndustries.length === 0
      || campaign.targetIndustries.includes(account.industry);
    const titleOk = containsAnyTerm(row.contact.jobTitle.toLowerCase(), terms) !== null;
    return geoOk && industryOk && titleOk;
  });
}

function methodRow(
  method: string,
  description: string,
  rows: CampaignContactFull[],
  eventsByContact: Map<string, EngagementEvent[]>,
  cost: number | null,
): MethodComparisonRow {
  let registered = 0;
  let attended = 0;
  let positive = 0;
  let meetings = 0;

  for (const row of rows) {
    const events = eventsByContact.get(row.contactId) ?? [];
    const types = new Set(events.map((event) => event.eventType));
    if (types.has('WEBINAR_REGISTERED')) registered += 1;
    if (types.has('WEBINAR_ATTENDED')) attended += 1;
    if (types.has('POSITIVE_EMAIL_REPLY')) positive += 1;
    if (types.has('MEETING_REQUESTED')) meetings += 1;
  }

  return {
    method,
    description,
    listSize: rows.length,
    registrationRate: rate(registered, rows.length),
    attendanceRate: rate(attended, rows.length),
    positiveResponseRate: rate(positive, rows.length),
    meetingRate: rate(meetings, rows.length),
    costPerVerifiedAttendee: cost !== null && attended > 0 ? cost / attended : null,
  };
}

export async function getCampaignAnalytics(
  repo: SignalRepository,
  campaignId: string,
): Promise<CampaignAnalytics | null> {
  const campaign = await repo.getCampaign(campaignId);
  if (!campaign) return null;

  const rows = await repo.listCampaignContacts(campaignId);
  const events = await repo.listEvents({ campaignId });

  const eventsByContact = new Map<string, EngagementEvent[]>();
  for (const event of events) {
    const list = eventsByContact.get(event.contactId) ?? [];
    list.push(event);
    eventsByContact.set(event.contactId, list);
  }

  // ---- KPIs --------------------------------------------------------------
  const byPriority = Object.fromEntries(PRIORITIES.map((priority) => [priority, 0])) as Record<Priority, number>;
  let dataQualityPass = 0;
  let relevancePass = 0;
  let compliancePass = 0;
  let awaitingApproval = 0;
  let inReviewQueue = 0;

  for (const row of rows) {
    byPriority[row.priority] += 1;
    if (row.dataQualityScore >= 7) dataQualityPass += 1;
    if (row.relevanceGatePassed) relevancePass += 1;
    if (row.complianceGatePassed) compliancePass += 1;
    if (row.priority === 'P1' && row.humanReviewStatus !== 'APPROVED') awaitingApproval += 1;
    if (row.humanReviewRequired) inReviewQueue += 1;
  }

  const emailsSent = countEvents(events, 'EMAIL_SENT');
  const emailsDelivered = countEvents(events, 'EMAIL_DELIVERED');
  const positiveReplies = contactsWith(events, 'POSITIVE_EMAIL_REPLY').size;
  const registeredContacts = contactsWith(events, 'WEBINAR_REGISTERED');
  const attendedContacts = contactsWith(events, 'WEBINAR_ATTENDED');
  const meetings = contactsWith(events, 'MEETING_REQUESTED').size;
  const depths = attendanceDepth(events);
  const cost = campaign.campaignCost ? Number(campaign.campaignCost) : null;

  const kpis: CampaignKpis = {
    totalContacts: rows.length,
    byPriority,
    dataQualityPassRate: rate(dataQualityPass, rows.length),
    relevanceGatePassRate: rate(relevancePass, rows.length),
    complianceGatePassRate: rate(compliancePass, rows.length),
    emailsSent,
    emailDeliveryRate: rate(emailsDelivered, emailsSent),
    positiveReplyRate: rate(positiveReplies, emailsDelivered || rows.length),
    registrations: registeredContacts.size,
    webinarRegistrationRate: rate(registeredContacts.size, rows.length),
    attendees: attendedContacts.size,
    liveAttendanceRate: rate(attendedContacts.size, registeredContacts.size),
    averageAttendanceDuration: depths.length > 0
      ? depths.reduce((sum, value) => sum + value, 0) / depths.length
      : 0,
    meetingRequests: meetings,
    campaignCost: cost,
    costPerVerifiedAttendee: cost !== null && attendedContacts.size > 0 ? cost / attendedContacts.size : null,
    currency: campaign.campaignCurrency,
    awaitingApproval,
    inReviewQueue,
  };

  // ---- charts ------------------------------------------------------------
  const contactsByPriority: PriorityCount[] = PRIORITIES
    .filter((priority) => byPriority[priority] > 0)
    .map((priority) => ({ priority, label: PRIORITY_LABELS[priority], count: byPriority[priority] }));

  const workable = rows.filter((row) => ['P1', 'P2', 'P3'].includes(row.priority));
  const contacted = new Set(rows.filter((row) => row.currentStatus !== 'NEW' && row.currentStatus !== 'ASSIGNED').map((row) => row.id));

  const funnel: FunnelStage[] = [
    { stage: 'Imported', count: rows.length, description: 'Contacts loaded into the campaign.' },
    { stage: 'Passed relevance gate', count: relevancePass, description: 'Cleared all blocking relevance checks.' },
    { stage: 'Workable (P1-P3)', count: workable.length, description: 'Scored into a working priority band.' },
    { stage: 'Contacted', count: contacted.size, description: 'At least one outreach attempt logged.' },
    { stage: 'Registered', count: registeredContacts.size, description: 'Registered for the event.' },
    { stage: 'Attended', count: attendedContacts.size, description: 'Joined the event live.' },
    { stage: 'Meeting requested', count: meetings, description: 'Asked for a one-to-one meeting.' },
  ];

  const registrationByPriority: RegistrationByPriority[] = (['P1', 'P2', 'P3'] as Priority[]).map((priority) => {
    const group = rows.filter((row) => row.priority === priority);
    return {
      priority: PRIORITY_LABELS[priority],
      contacts: group.length,
      registered: group.filter((row) => registeredContacts.has(row.contactId)).length,
      attended: group.filter((row) => attendedContacts.has(row.contactId)).length,
    };
  });

  const buckets = ['0-19', '20-39', '40-59', '60-79', '80-100'];
  const scoreDistribution: ScoreBucket[] = buckets.map((bucket) => ({ bucket, count: 0 }));
  for (const row of rows) {
    const index = row.totalScore >= 80 ? 4 : row.totalScore >= 60 ? 3 : row.totalScore >= 40 ? 2 : row.totalScore >= 20 ? 1 : 0;
    scoreDistribution[index]!.count += 1;
  }

  const byDate = new Map<string, EventsOverTime>();
  for (const event of events) {
    const key = event.eventDate.toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { date: key, events: 0, registrations: 0, attendance: 0 };
    entry.events += 1;
    if (event.eventType === 'WEBINAR_REGISTERED') entry.registrations += 1;
    if (event.eventType === 'WEBINAR_ATTENDED') entry.attendance += 1;
    byDate.set(key, entry);
  }
  const eventsOverTime = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  // ---- account-level engagement -----------------------------------------
  const byAccount = new Map<string, CampaignContactFull[]>();
  for (const row of rows) {
    const list = byAccount.get(row.contact.accountId) ?? [];
    list.push(row);
    byAccount.set(row.contact.accountId, list);
  }
  const accountEngagement: AccountEngagementRow[] = [...byAccount.entries()]
    .map(([accountId, group]) => {
      const signal = computeAccountSignal({
        accountId,
        companyName: group[0]!.contact.account.companyName,
        contacts: group.map((row) => ({ contactId: row.contactId, events: eventsByContact.get(row.contactId) ?? [] })),
      });
      const topPriority = (['P1', 'P2', 'P3', 'COMPLIANCE_HOLD', 'REJECT'] as Priority[])
        .find((priority) => group.some((row) => row.priority === priority)) ?? 'UNSCORED';
      return { ...signal, topPriority };
    })
    .filter((row) => row.engaged > 0 || row.registered > 0)
    .sort((a, b) => b.engaged - a.engaged || b.registered - a.registered);

  // ---- old method versus SIGNAL -----------------------------------------
  const surface = surfaceLevelList(rows, campaign);
  const signalList = rows.filter((row) => row.priority === 'P1' || row.priority === 'P2');
  const methodComparison: MethodComparisonRow[] = [
    methodRow(
      'Surface-level list',
      'Keyword in the job title, plus country and industry. No ownership test.',
      surface, eventsByContact, cost,
    ),
    methodRow(
      'SIGNAL-scored list',
      'P1 and P2 only: confirmed problem ownership, gates passed, trigger and data quality checked.',
      signalList, eventsByContact, cost,
    ),
  ];

  return {
    campaign, kpis, contactsByPriority, funnel, registrationByPriority,
    scoreDistribution, eventsOverTime, accountEngagement, methodComparison,
  };
}

export interface DataQualitySummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  missingEmail: number;
  missingPhone: number;
  unverifiedRole: number;
  missingCompliance: number;
  stale: number;
  neverVerified: number;
}

/** Data-quality counters over every contact the agency holds. */
export async function getDataQualitySummary(repo: SignalRepository): Promise<DataQualitySummary> {
  const contacts = await repo.listContacts();
  const staleThreshold = Date.now() - 180 * 86_400_000;

  let valid = 0, invalid = 0, duplicates = 0, missingEmail = 0, missingPhone = 0;
  let unverifiedRole = 0, missingCompliance = 0, stale = 0, neverVerified = 0;

  for (const contact of contacts) {
    const emailUsable = Boolean(contact.workEmail)
      && !['INVALID', 'BOUNCED', 'MISSING'].includes(contact.emailStatus);
    const phoneUsable = Boolean(contact.phoneNumber)
      && !['INVALID', 'WRONG_NUMBER', 'MISSING'].includes(contact.phoneStatus);

    if (!emailUsable) missingEmail += 1;
    if (!phoneUsable) missingPhone += 1;
    if (contact.isDuplicate) duplicates += 1;
    if (contact.roleCategory === 'UNKNOWN' || contact.roleConfidence === 'LOW' || contact.roleConfidence === 'UNKNOWN') {
      unverifiedRole += 1;
    }
    const record = contact.complianceRecords[0];
    if (!record || record.lawfulBasis === 'NOT_DETERMINED' || record.consentStatus === 'NOT_CAPTURED') {
      missingCompliance += 1;
    }
    if (!contact.lastVerifiedAt) neverVerified += 1;
    else if (contact.lastVerifiedAt.getTime() < staleThreshold) stale += 1;

    const isInvalid = contact.isDuplicate || (!emailUsable && !phoneUsable);
    if (isInvalid) invalid += 1; else valid += 1;
  }

  return {
    total: contacts.length, valid, invalid, duplicates, missingEmail, missingPhone,
    unverifiedRole, missingCompliance, stale, neverVerified,
  };
}
