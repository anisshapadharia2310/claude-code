/**
 * Post-seed qualification.
 *
 * Runs the real engine over the seeded data - the seed does not hard-code a
 * single score or priority. It then simulates the human steps an agency would
 * already have taken: managers approved some P1s, researchers wrote the
 * justifications, callers were assigned and some outcomes were logged.
 */
import type { Prisma } from '@prisma/client';
import { rescoreCampaign } from '../services/scoring';
import type { SignalRepository } from '../repo/types';

export interface SeedQualificationSummary {
  campaigns: number;
  scored: number;
  approvedP1s: number;
  assigned: number;
  callsLogged: number;
  byPriority: Record<string, number>;
}

/** Deterministic selector so repeated seeds produce the same demo state. */
function pick<T>(items: T[], everyNth: number): T[] {
  return items.filter((_, index) => index % everyNth !== everyNth - 1);
}

export async function applySeedQualification(repo: SignalRepository): Promise<SeedQualificationSummary> {
  const campaigns = await repo.listCampaigns();
  const byPriority: Record<string, number> = {};
  let scored = 0;

  for (const campaign of campaigns) {
    const summary = await rescoreCampaign(repo, campaign.id, {
      reason: 'INITIAL_SCORE',
      detail: 'Initial qualification at import.',
    });
    scored += summary.scored;
  }

  const users = await repo.listUsers();
  const callers = users.filter((user) => user.role === 'CALLER');
  const manager = users.find((user) => user.role === 'MANAGER') ?? null;
  const researcher = users.find((user) => user.role === 'RESEARCHER') ?? null;

  let approvedP1s = 0;
  let assigned = 0;
  let callsLogged = 0;
  let callerIndex = 0;

  for (const campaign of campaigns) {
    const links = await repo.listCampaignContacts(campaign.id);

    // Managers have approved most, but not all, of the P1 candidates. The
    // remainder stay in the review queue, which is the realistic state.
    const p1s = links.filter((link) => link.priority === 'P1');
    for (const link of pick(p1s, 4)) {
      await repo.updateCampaignContact(link.id, {
        whyThisContact: link.whyThisContactDraft
          ?? `${link.contact.firstName} ${link.contact.lastName} owns the campaign problem at ${link.contact.account.companyName} and the trigger is verified.`,
        humanReviewStatus: 'APPROVED',
        humanReviewRequired: false,
        reviewedBy: manager ? { connect: { id: manager.id } } : undefined,
        reviewedAt: new Date(),
        reviewNotes: 'Ownership confirmed against the company org chart and the trigger source.',
      });
      approvedP1s += 1;
    }

    // Researchers have already triaged a slice of the queue.
    const queue = links.filter((link) => link.humanReviewRequired && link.priority !== 'P1');
    for (const link of pick(queue, 3).slice(0, 8)) {
      await repo.updateCampaignContact(link.id, {
        humanReviewStatus: 'IN_REVIEW',
        reviewedBy: researcher ? { connect: { id: researcher.id } } : undefined,
        reviewNotes: 'Picked up for role verification.',
      });
    }

    // P1 and P2 work is distributed across the calling team.
    const workable = links.filter((link) => link.priority === 'P1' || link.priority === 'P2');
    for (const link of workable) {
      if (callers.length === 0) break;
      const caller = callers[callerIndex % callers.length]!;
      callerIndex += 1;
      await repo.updateCampaignContact(link.id, {
        assignedUser: { connect: { id: caller.id } },
        currentStatus: 'ASSIGNED',
      });
      assigned += 1;
    }

    // A realistic slice of call history so the outreach screens are not empty.
    const called = workable.filter((_, index) => index % 3 === 0).slice(0, 12);
    const outcomes: Prisma.CallActivityCreateManyInput['outcome'][] = [
      'CONNECTED', 'NO_ANSWER', 'INTERESTED', 'CALLBACK_REQUESTED',
      'SENT_WEBINAR_LINK', 'REGISTERED', 'NOT_RELEVANT', 'BUSY',
    ];
    for (let index = 0; index < called.length; index += 1) {
      const link = called[index]!;
      if (callers.length === 0) break;
      const outcome = outcomes[index % outcomes.length]!;
      await repo.createCallActivity({
        campaignContactId: link.id,
        callerId: callers[index % callers.length]!.id,
        callDate: new Date(Date.now() - (index + 1) * 86_400_000),
        outcome,
        notes: outcome === 'CONNECTED'
          ? 'Confirmed they own the programme. Sent the agenda.'
          : outcome === 'NOT_RELEVANT'
            ? 'Owns a different area than the title suggested. Downgrade.'
            : 'Left a voicemail with the callback number.',
        nextAction: outcome === 'CONNECTED' ? 'Send the invitation and follow up in three days.' : 'Retry tomorrow morning local time.',
        nextFollowUpAt: new Date(Date.now() + (index % 5 + 1) * 86_400_000),
        durationSeconds: outcome === 'CONNECTED' ? 240 + index * 13 : null,
      });
      await repo.updateCampaignContact(link.id, {
        currentStatus: outcome === 'REGISTERED'
          ? 'REGISTERED'
          : outcome === 'CONNECTED' || outcome === 'INTERESTED'
            ? 'CONTACTED'
            : outcome === 'NOT_RELEVANT'
              ? 'CLOSED_LOST'
              : 'ATTEMPTED',
        nextFollowUpAt: new Date(Date.now() + (index % 5 + 1) * 86_400_000),
      });
      callsLogged += 1;
    }
  }

  // Rescore once more so approvals and review outcomes are reflected.
  for (const campaign of campaigns) {
    const summary = await rescoreCampaign(repo, campaign.id, {
      reason: 'MANUAL_REVIEW',
      detail: 'Rescored after seeded human review.',
    });
    for (const [priority, count] of Object.entries(summary.byPriority)) {
      byPriority[priority] = (byPriority[priority] ?? 0) + count;
    }
  }

  return { campaigns: campaigns.length, scored, approvedP1s, assigned, callsLogged, byPriority };
}
