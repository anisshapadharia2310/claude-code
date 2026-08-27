/**
 * Engagement event scoring.
 *
 * Two separate things happen with engagement events:
 *   - Band D of the base score reads pre-event intent (reply, download,
 *     registration, resource click, prior attendance). Capped at its band max.
 *   - The post-webinar bonus reads attendance-and-after behaviour and is added
 *     on top of the base score. The combined total is hard-capped at 100.
 *
 * Registration is credited once, in band D. When it also appears in the bonus
 * table the bonus entry is recorded as suppressed, with the reason visible, so
 * the timeline still shows the event without double counting it.
 */
import type { EngagementEvent, EventType, EngagementBonusEntry } from './types';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  WHITEPAPER_SENT: 'White paper sent',
  WHITEPAPER_DELIVERED: 'White paper delivered',
  WHITEPAPER_OPENED: 'White paper opened',
  WHITEPAPER_DOWNLOADED: 'White paper downloaded',
  EMAIL_SENT: 'Email sent',
  EMAIL_DELIVERED: 'Email delivered',
  EMAIL_OPENED: 'Email opened',
  EMAIL_CLICKED: 'Email link clicked',
  EMAIL_REPLIED: 'Email replied',
  POSITIVE_EMAIL_REPLY: 'Positive email reply',
  WEBINAR_INVITATION_SENT: 'Webinar invitation sent',
  WEBINAR_REGISTERED: 'Registered for webinar',
  WEBINAR_ATTENDED: 'Attended webinar live',
  WEBINAR_ATTENDANCE_50_PERCENT: 'Attended at least 50%',
  WEBINAR_ATTENDANCE_75_PERCENT: 'Attended at least 75%',
  WEBINAR_ATTENDANCE_80_PERCENT: 'Attended at least 80%',
  STAYED_FOR_QA: 'Stayed through Q&A',
  POLL_ANSWERED: 'Answered a poll',
  QUESTION_ASKED: 'Asked a question',
  RESOURCE_DOWNLOADED: 'Downloaded a resource',
  CTA_CLICKED: 'Clicked a call to action',
  REPLAY_WATCHED: 'Watched the replay',
  MEETING_REQUESTED: 'Requested a one-to-one meeting',
  CALL_CONNECTED: 'Call connected',
  CALL_NO_ANSWER: 'Call not answered',
  CALL_CALLBACK_REQUESTED: 'Callback requested',
  NOT_INTERESTED: 'Not interested',
  OPTED_OUT: 'Opted out',
};

/** Default post-webinar point values. */
export const POST_WEBINAR_POINTS: Partial<Record<EventType, number>> = {
  WEBINAR_REGISTERED: 4,
  WEBINAR_ATTENDED: 5,
  WEBINAR_ATTENDANCE_50_PERCENT: 10,
  WEBINAR_ATTENDANCE_75_PERCENT: 15,
  WEBINAR_ATTENDANCE_80_PERCENT: 20,
  STAYED_FOR_QA: 5,
  POLL_ANSWERED: 5,
  QUESTION_ASKED: 10,
  RESOURCE_DOWNLOADED: 5,
  CTA_CLICKED: 10,
  REPLAY_WATCHED: 5,
  MEETING_REQUESTED: 20,
};

/**
 * Attendance-depth tiers form a ladder, not a stack: somebody who reached 80%
 * necessarily passed 50% and 75%. Only the highest tier reached is scored.
 */
const ATTENDANCE_TIERS: EventType[] = [
  'WEBINAR_ATTENDANCE_80_PERCENT',
  'WEBINAR_ATTENDANCE_75_PERCENT',
  'WEBINAR_ATTENDANCE_50_PERCENT',
];

/** Events that are negative signals: they reduce or stop outreach. */
export const NEGATIVE_EVENTS: EventType[] = ['NOT_INTERESTED', 'OPTED_OUT'];

export function hasEvent(events: EngagementEvent[], ...types: EventType[]): boolean {
  return events.some((event) => types.includes(event.eventType));
}

export function findEvent(events: EngagementEvent[], ...types: EventType[]): EngagementEvent | null {
  return events.find((event) => types.includes(event.eventType)) ?? null;
}

export interface EngagementBonusResult {
  points: number;
  entries: EngagementBonusEntry[];
}

export interface EngagementBonusOptions {
  /**
   * Event types already credited inside the base score. Defaults to webinar
   * registration, which band D awards.
   */
  creditedInBaseScore?: EventType[];
}

/**
 * Compute the post-webinar bonus for one contact on one campaign.
 * Each event type contributes at most once.
 */
export function computeEngagementBonus(
  events: EngagementEvent[],
  options: EngagementBonusOptions = {},
): EngagementBonusResult {
  const creditedInBase = options.creditedInBaseScore ?? ['WEBINAR_REGISTERED'];
  const entries: EngagementBonusEntry[] = [];
  const seen = new Set<EventType>();
  let points = 0;

  // Resolve the attendance ladder to a single winning tier.
  const highestTier = ATTENDANCE_TIERS.find((tier) => hasEvent(events, tier)) ?? null;

  const sorted = [...events].sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  for (const event of sorted) {
    const value = POST_WEBINAR_POINTS[event.eventType];
    if (value === undefined) continue;
    if (seen.has(event.eventType)) continue;
    seen.add(event.eventType);

    if (ATTENDANCE_TIERS.includes(event.eventType) && event.eventType !== highestTier) {
      entries.push({
        eventType: event.eventType,
        label: EVENT_TYPE_LABELS[event.eventType],
        points: 0,
        occurredAt: event.eventDate.toISOString(),
        suppressedReason: `Superseded by the higher attendance tier "${EVENT_TYPE_LABELS[highestTier!]}".`,
      });
      continue;
    }

    if (creditedInBase.includes(event.eventType)) {
      entries.push({
        eventType: event.eventType,
        label: EVENT_TYPE_LABELS[event.eventType],
        points: 0,
        occurredAt: event.eventDate.toISOString(),
        suppressedReason: 'Already credited in band D of the base score.',
      });
      continue;
    }

    points += value;
    entries.push({
      eventType: event.eventType,
      label: EVENT_TYPE_LABELS[event.eventType],
      points: value,
      occurredAt: event.eventDate.toISOString(),
    });
  }

  return { points, entries };
}

/** Points recorded on an individual event as it is written to the ledger. */
export function pointsForEvent(eventType: EventType): number {
  return POST_WEBINAR_POINTS[eventType] ?? 0;
}

export interface TimelineEntry {
  id: string;
  eventType: EventType;
  label: string;
  occurredAt: Date;
  pointsAwarded: number;
  metadata: unknown;
  negative: boolean;
}

/** Chronological engagement timeline for a contact. */
export function buildTimeline(events: EngagementEvent[]): TimelineEntry[] {
  return [...events]
    .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())
    .map((event) => ({
      id: event.id,
      eventType: event.eventType,
      label: EVENT_TYPE_LABELS[event.eventType],
      occurredAt: event.eventDate,
      pointsAwarded: event.pointsAwarded,
      metadata: event.metadata,
      negative: NEGATIVE_EVENTS.includes(event.eventType),
    }));
}
