import { EventType, Priority } from '@prisma/client';
import { prisma } from '../db';
import { calculateAccountSignal } from '../domain/account-signal';
import { P1_MIN_DATA_QUALITY } from '../domain/constants';
import type { AccountSignal } from '../domain/types';

const ATTENDANCE_EVENTS: EventType[] = [
  EventType.WEBINAR_ATTENDED,
  EventType.WEBINAR_ATTENDANCE_50_PERCENT,
  EventType.WEBINAR_ATTENDANCE_75_PERCENT,
  EventType.WEBINAR_ATTENDANCE_80_PERCENT,
];

/** Priorities that represent a qualified, contactable contact. */
const QUALIFIED_PRIORITIES: Priority[] = [Priority.P1, Priority.P2, Priority.P3];
/** The list the agency actually works by phone and personalised email. */
const OUTREACH_PRIORITIES: Priority[] = [Priority.P1, Priority.P2];

/** Events that count as "we reached this contact". */
const CONTACTED_EVENTS: EventType[] = [
  EventType.EMAIL_SENT,
  EventType.CALL_CONNECTED,
  EventType.WEBINAR_INVITATION_SENT,
  EventType.WHITEPAPER_SENT,
];

/** Assumed watch-time when an event carries no explicit duration. */
const TIER_PERCENT: Partial<Record<EventType, number>> = {
  WEBINAR_ATTENDED: 25,
  WEBINAR_ATTENDANCE_50_PERCENT: 50,
  WEBINAR_ATTENDANCE_75_PERCENT: 75,
  WEBINAR_ATTENDANCE_80_PERCENT: 85,
};

function rate(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export interface CampaignKpis {
  totalContacts: number;
  p1: number;
  p2: number;
  p3: number;
  reject: number;
  complianceHold: number;
  unscored: number;
  dataQualityPassRate: number;
  relevanceGatePassRate: number;
  emailsSent: number;
  emailDeliveryRate: number;
  positiveReplyRate: number;
  webinarRegistrationRate: number;
  liveAttendanceRate: number;
  averageAttendanceDuration: number;
  meetingRequests: number;
  campaignCost: number | null;
  currency: string;
  verifiedAttendees: number;
  costPerVerifiedAttendee: number | null;
}

export async function getCampaignKpis(campaignId: string): Promise<CampaignKpis> {
  const [campaign, campaignContacts, events, emails] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    prisma.campaignContact.findMany({
      where: { campaignId },
      select: {
        contactId: true,
        priority: true,
        dataQualityScore: true,
        relevanceGatePassed: true,
      },
    }),
    prisma.engagementEvent.findMany({
      where: { campaignId },
      select: { contactId: true, eventType: true, metadata: true },
    }),
    prisma.emailActivity.findMany({
      where: { campaignContact: { campaignId } },
      select: { deliveryStatus: true, sentAt: true },
    }),
  ]);

  const count = (priority: Priority) =>
    campaignContacts.filter((c) => c.priority === priority).length;

  const contactedIds = new Set(
    events
      .filter((e) => CONTACTED_EVENTS.includes(e.eventType))
      .map((e) => e.contactId),
  );
  const registeredIds = new Set(
    events.filter((e) => e.eventType === EventType.WEBINAR_REGISTERED).map((e) => e.contactId),
  );
  const attendedIds = new Set(
    events.filter((e) => ATTENDANCE_EVENTS.includes(e.eventType)).map((e) => e.contactId),
  );
  const positiveReplyIds = new Set(
    events.filter((e) => e.eventType === EventType.POSITIVE_EMAIL_REPLY).map((e) => e.contactId),
  );
  const meetingIds = new Set(
    events.filter((e) => e.eventType === EventType.MEETING_REQUESTED).map((e) => e.contactId),
  );

  // Average attendance duration, as a percentage of the session.
  const durations: number[] = [];
  for (const contactId of attendedIds) {
    const contactEvents = events.filter(
      (e) => e.contactId === contactId && ATTENDANCE_EVENTS.includes(e.eventType),
    );
    const explicit = contactEvents
      .map((e) => (e.metadata as { attendedPercent?: number } | null)?.attendedPercent)
      .find((value) => typeof value === 'number');
    const inferred = Math.max(...contactEvents.map((e) => TIER_PERCENT[e.eventType] ?? 0));
    durations.push(explicit ?? inferred);
  }

  const emailsSent = emails.filter((e) => e.sentAt).length;
  const emailsDelivered = emails.filter((e) =>
    ['DELIVERED', 'SENT', 'LOGGED_MANUALLY'].includes(e.deliveryStatus),
  ).length;

  const cost = campaign.campaignCost ? Number(campaign.campaignCost) : null;
  const verifiedAttendees = attendedIds.size;

  return {
    totalContacts: campaignContacts.length,
    p1: count(Priority.P1),
    p2: count(Priority.P2),
    p3: count(Priority.P3),
    reject: count(Priority.REJECT),
    complianceHold: count(Priority.COMPLIANCE_HOLD),
    unscored: count(Priority.UNSCORED),
    dataQualityPassRate: rate(
      campaignContacts.filter((c) => c.dataQualityScore >= P1_MIN_DATA_QUALITY).length,
      campaignContacts.length,
    ),
    relevanceGatePassRate: rate(
      campaignContacts.filter((c) => c.relevanceGatePassed).length,
      campaignContacts.length,
    ),
    emailsSent,
    emailDeliveryRate: rate(emailsDelivered, emailsSent),
    positiveReplyRate: rate(positiveReplyIds.size, emailsSent || contactedIds.size),
    webinarRegistrationRate: rate(registeredIds.size, contactedIds.size || campaignContacts.length),
    liveAttendanceRate: rate(attendedIds.size, registeredIds.size),
    averageAttendanceDuration: durations.length
      ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1))
      : 0,
    meetingRequests: meetingIds.size,
    campaignCost: cost,
    currency: campaign.currency,
    verifiedAttendees,
    costPerVerifiedAttendee:
      cost !== null && verifiedAttendees > 0 ? Number((cost / verifiedAttendees).toFixed(2)) : null,
  };
}

export interface CampaignCharts {
  contactsByPriority: Array<{ priority: string; count: number }>;
  funnel: Array<{ stage: string; count: number }>;
  registrationByPriority: Array<{ priority: string; registered: number; attended: number; total: number }>;
  scoreDistribution: Array<{ band: string; count: number }>;
  eventsOverTime: Array<{ date: string; events: number; positive: number }>;
}

export async function getCampaignCharts(campaignId: string): Promise<CampaignCharts> {
  const [campaignContacts, events] = await Promise.all([
    prisma.campaignContact.findMany({
      where: { campaignId },
      select: { contactId: true, priority: true, totalScore: true, relevanceGatePassed: true },
    }),
    prisma.engagementEvent.findMany({
      where: { campaignId },
      select: { contactId: true, eventType: true, eventDate: true },
      orderBy: { eventDate: 'asc' },
    }),
  ]);

  const priorities: Priority[] = [
    Priority.P1,
    Priority.P2,
    Priority.P3,
    Priority.REJECT,
    Priority.COMPLIANCE_HOLD,
  ];

  const registeredIds = new Set(
    events.filter((e) => e.eventType === EventType.WEBINAR_REGISTERED).map((e) => e.contactId),
  );
  const attendedIds = new Set(
    events.filter((e) => ATTENDANCE_EVENTS.includes(e.eventType)).map((e) => e.contactId),
  );
  const contactedIds = new Set(
    events
      .filter((e) => CONTACTED_EVENTS.includes(e.eventType))
      .map((e) => e.contactId),
  );
  const meetingIds = new Set(
    events.filter((e) => e.eventType === EventType.MEETING_REQUESTED).map((e) => e.contactId),
  );

  const bands = [
    { band: '0-19', min: 0, max: 19 },
    { band: '20-39', min: 20, max: 39 },
    { band: '40-59', min: 40, max: 59 },
    { band: '60-79', min: 60, max: 79 },
    { band: '80-100', min: 80, max: 100 },
  ];

  const byDate = new Map<string, { events: number; positive: number }>();
  const positiveTypes: EventType[] = [
    EventType.POSITIVE_EMAIL_REPLY,
    EventType.WEBINAR_REGISTERED,
    EventType.WEBINAR_ATTENDED,
    EventType.MEETING_REQUESTED,
    EventType.CTA_CLICKED,
    EventType.QUESTION_ASKED,
  ];
  for (const event of events) {
    const key = event.eventDate.toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { events: 0, positive: 0 };
    entry.events += 1;
    if (positiveTypes.includes(event.eventType)) entry.positive += 1;
    byDate.set(key, entry);
  }

  return {
    contactsByPriority: priorities.map((priority) => ({
      priority: priority.replace('_', ' '),
      count: campaignContacts.filter((c) => c.priority === priority).length,
    })),
    funnel: [
      { stage: 'Imported', count: campaignContacts.length },
      {
        stage: 'Passed relevance gate',
        count: campaignContacts.filter((c) => c.relevanceGatePassed).length,
      },
      {
        stage: 'Qualified (P1-P3)',
        count: campaignContacts.filter((c) => QUALIFIED_PRIORITIES.includes(c.priority)).length,
      },
      { stage: 'Contacted', count: contactedIds.size },
      { stage: 'Registered', count: registeredIds.size },
      { stage: 'Attended', count: attendedIds.size },
      { stage: 'Meeting requested', count: meetingIds.size },
    ],
    registrationByPriority: [Priority.P1, Priority.P2, Priority.P3].map((priority) => {
      const group = campaignContacts.filter((c) => c.priority === priority);
      return {
        priority,
        total: group.length,
        registered: group.filter((c) => registeredIds.has(c.contactId)).length,
        attended: group.filter((c) => attendedIds.has(c.contactId)).length,
      };
    }),
    scoreDistribution: bands.map(({ band, min, max }) => ({
      band,
      count: campaignContacts.filter((c) => c.totalScore >= min && c.totalScore <= max).length,
    })),
    eventsOverTime: Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, ...value })),
  };
}

export interface MethodComparison {
  method: string;
  listSize: number;
  contacted: number;
  registered: number;
  attended: number;
  positiveReplies: number;
  meetings: number;
  registrationRate: number;
  attendanceRate: number;
  positiveResponseRate: number;
  meetingRate: number;
  costPerVerifiedAttendee: number | null;
}

/**
 * Compares the agency's pre-SIGNAL surface filter against the SIGNAL-qualified
 * list on the same underlying data, using the same campaign cost for both.
 */
export async function compareMethods(campaignId: string): Promise<{
  comparison: MethodComparison[];
  currency: string;
}> {
  const [campaign, campaignContacts, events] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    prisma.campaignContact.findMany({
      where: { campaignId },
      select: { contactId: true, priority: true, surfaceLevelMatch: true },
    }),
    prisma.engagementEvent.findMany({
      where: { campaignId },
      select: { contactId: true, eventType: true },
    }),
  ]);

  const idsWith = (types: EventType[]) =>
    new Set(events.filter((e) => types.includes(e.eventType)).map((e) => e.contactId));

  const registered = idsWith([EventType.WEBINAR_REGISTERED]);
  const attended = idsWith(ATTENDANCE_EVENTS);
  const positive = idsWith([EventType.POSITIVE_EMAIL_REPLY]);
  const meetings = idsWith([EventType.MEETING_REQUESTED]);
  const contacted = idsWith(CONTACTED_EVENTS);

  const cost = campaign.campaignCost ? Number(campaign.campaignCost) : null;

  const build = (
    method: string,
    list: typeof campaignContacts,
  ): MethodComparison => {
    const ids = list.map((c) => c.contactId);
    const inList = (set: Set<string>) => ids.filter((id) => set.has(id)).length;
    const contactedCount = inList(contacted);
    const registeredCount = inList(registered);
    const attendedCount = inList(attended);
    return {
      method,
      listSize: list.length,
      contacted: contactedCount,
      registered: registeredCount,
      attended: attendedCount,
      positiveReplies: inList(positive),
      meetings: inList(meetings),
      registrationRate: rate(registeredCount, list.length),
      attendanceRate: rate(attendedCount, registeredCount),
      positiveResponseRate: rate(inList(positive), contactedCount || list.length),
      meetingRate: rate(inList(meetings), list.length),
      costPerVerifiedAttendee:
        cost !== null && attendedCount > 0 ? Number((cost / attendedCount).toFixed(2)) : null,
    };
  };

  return {
    currency: campaign.currency,
    comparison: [
      build(
        'Surface-level list (old method)',
        campaignContacts.filter((c) => c.surfaceLevelMatch),
      ),
      build(
        'SIGNAL-scored list (P1-P2)',
        campaignContacts.filter((c) => OUTREACH_PRIORITIES.includes(c.priority)),
      ),
    ],
  };
}

/** Account-level engagement for a campaign, ranked by strength of signal. */
export async function getAccountSignals(campaignId: string): Promise<AccountSignal[]> {
  const [campaignContacts, events] = await Promise.all([
    prisma.campaignContact.findMany({
      where: { campaignId },
      select: {
        contactId: true,
        contact: { select: { accountId: true, account: { select: { companyName: true } } } },
      },
    }),
    prisma.engagementEvent.findMany({
      where: { campaignId },
      select: { contactId: true, eventType: true },
    }),
  ]);

  const eventsByContact = new Map<string, EventType[]>();
  for (const event of events) {
    const list = eventsByContact.get(event.contactId) ?? [];
    list.push(event.eventType);
    eventsByContact.set(event.contactId, list);
  }

  const byAccount = new Map<
    string,
    { companyName: string; contacts: Array<{ contactId: string; eventTypes: EventType[] }> }
  >();
  for (const record of campaignContacts) {
    const accountId = record.contact.accountId;
    const entry = byAccount.get(accountId) ?? {
      companyName: record.contact.account.companyName,
      contacts: [],
    };
    entry.contacts.push({
      contactId: record.contactId,
      eventTypes: eventsByContact.get(record.contactId) ?? [],
    });
    byAccount.set(accountId, entry);
  }

  return Array.from(byAccount.entries())
    .map(([accountId, entry]) =>
      calculateAccountSignal({
        accountId,
        companyName: entry.companyName,
        contactsInCampaign: entry.contacts.length,
        contactEvents: entry.contacts,
      }),
    )
    .sort(
      (a, b) =>
        b.meetingsRequested - a.meetingsRequested ||
        b.engaged - a.engaged ||
        b.registered - a.registered,
    );
}

/** Portfolio-level counts for the dashboard header. */
export async function getPortfolioSummary() {
  const [campaigns, contacts, accounts, p1, reviewQueue] = await Promise.all([
    prisma.campaign.count(),
    prisma.contact.count(),
    prisma.account.count(),
    prisma.campaignContact.count({ where: { priority: Priority.P1 } }),
    prisma.campaignContact.count({ where: { humanReviewStatus: 'PENDING' } }),
  ]);
  return { campaigns, contacts, accounts, p1, reviewQueue };
}
