import { EventType } from '@prisma/client';
import type { EngagementEventInput } from './types';

/**
 * Post-webinar engagement points. These are added on top of the qualification
 * score and are tracked separately so the base score stays explainable.
 */
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
 * Attendance-duration events are cumulative tiers rather than separate
 * achievements: a contact who reached 80% necessarily also passed 50% and 75%.
 * Only the highest tier is counted so duration is not triple-charged.
 */
const ATTENDANCE_TIERS: EventType[] = [
  EventType.WEBINAR_ATTENDANCE_50_PERCENT,
  EventType.WEBINAR_ATTENDANCE_75_PERCENT,
  EventType.WEBINAR_ATTENDANCE_80_PERCENT,
];

export interface EngagementBonusLine {
  eventType: EventType;
  points: number;
  reason: string;
}

export interface EngagementBonusResult {
  bonus: number;
  lines: EngagementBonusLine[];
}

/**
 * Sums post-webinar engagement points. Each event type contributes at most once
 * (a contact who opens three resources is engaged, not three times as engaged),
 * and only the highest attendance-duration tier counts.
 */
export function calculateEngagementBonus(events: EngagementEventInput[]): EngagementBonusResult {
  const seen = new Set<EventType>();
  const lines: EngagementBonusLine[] = [];

  const present = new Set(events.map((e) => e.eventType));
  const highestTier = [...ATTENDANCE_TIERS].reverse().find((tier) => present.has(tier));

  for (const event of events) {
    const points = POST_WEBINAR_POINTS[event.eventType];
    if (points === undefined) continue;
    if (seen.has(event.eventType)) continue;
    if (ATTENDANCE_TIERS.includes(event.eventType) && event.eventType !== highestTier) {
      lines.push({
        eventType: event.eventType,
        points: 0,
        reason: `Superseded by the higher attendance tier ${highestTier?.replace(/_/g, ' ').toLowerCase()}.`,
      });
      seen.add(event.eventType);
      continue;
    }
    seen.add(event.eventType);
    lines.push({
      eventType: event.eventType,
      points,
      reason: `${humanizeEvent(event.eventType)} (+${points}).`,
    });
  }

  return { bonus: lines.reduce((sum, line) => sum + line.points, 0), lines };
}

/** Points recorded on the EngagementEvent row itself when it is created. */
export function pointsForEvent(eventType: EventType): number {
  return POST_WEBINAR_POINTS[eventType] ?? 0;
}

export function humanizeEvent(eventType: EventType): string {
  return eventType
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/(\d+) Percent/, '$1%');
}

/** Event types that represent genuine buying/attention signals. */
export const POSITIVE_INTENT_EVENTS: EventType[] = [
  EventType.POSITIVE_EMAIL_REPLY,
  EventType.WHITEPAPER_DOWNLOADED,
  EventType.WEBINAR_REGISTERED,
  EventType.WEBINAR_ATTENDED,
  EventType.WEBINAR_ATTENDANCE_50_PERCENT,
  EventType.WEBINAR_ATTENDANCE_75_PERCENT,
  EventType.WEBINAR_ATTENDANCE_80_PERCENT,
  EventType.STAYED_FOR_QA,
  EventType.POLL_ANSWERED,
  EventType.QUESTION_ASKED,
  EventType.RESOURCE_DOWNLOADED,
  EventType.CTA_CLICKED,
  EventType.REPLAY_WATCHED,
  EventType.MEETING_REQUESTED,
];

export const NEGATIVE_EVENTS: EventType[] = [EventType.NOT_INTERESTED, EventType.OPTED_OUT];
