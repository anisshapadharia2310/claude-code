/**
 * Scoring service.
 *
 * Orchestrates the pure domain pipeline against stored data and persists the
 * result, including an append-only audit entry whenever a score or priority
 * actually changes.
 */
import type { Prisma, ScoringConfig } from '@prisma/client';
import { computeAccountSignal } from '@/domain/account-signal';
import { qualifyContact } from '@/domain/qualify';
import { cloneDefaultWeights, COMPONENT_DEFINITIONS } from '@/domain/weights';
import type { AccountSignal, EngagementEvent, ScoringWeights } from '@/domain/types';
import type { CampaignContactFull, SignalRepository } from '../repo/types';

/** Turn a stored ScoringConfig row into the domain weight structure. */
export function weightsFromConfig(config: ScoringConfig | null): ScoringWeights {
  const weights = cloneDefaultWeights();
  if (!config) return weights;

  weights.bandMax = {
    A: config.companyFitMax,
    B: config.roleRelevanceMax,
    C: config.triggerMax,
    D: config.engagementMax,
    E: config.dataQualityMax,
    F: config.attendanceLikelihoodMax,
  };
  weights.thresholds = {
    p1: config.p1Threshold,
    p2: config.p2Threshold,
    p3: config.p3Threshold,
    p1MinRoleRelevance: config.p1MinRoleRelevance,
    p1MinDataQuality: config.p1MinDataQuality,
  };

  const stored = (config.componentWeights ?? {}) as Record<string, number>;
  for (const definition of COMPONENT_DEFINITIONS) {
    const value = stored[definition.code];
    if (typeof value === 'number') weights.componentMax[definition.code] = value;
  }
  return weights;
}

/** Serialise domain weights back into the shape the ScoringConfig row stores. */
export function configFromWeights(
  weights: ScoringWeights,
  updatedById?: string,
): Omit<Prisma.ScoringConfigCreateManyInput, 'campaignId' | 'id'> {
  return {
    companyFitMax: weights.bandMax.A,
    roleRelevanceMax: weights.bandMax.B,
    triggerMax: weights.bandMax.C,
    engagementMax: weights.bandMax.D,
    dataQualityMax: weights.bandMax.E,
    attendanceLikelihoodMax: weights.bandMax.F,
    componentWeights: weights.componentMax as Prisma.InputJsonValue,
    p1Threshold: weights.thresholds.p1,
    p2Threshold: weights.thresholds.p2,
    p3Threshold: weights.thresholds.p3,
    p1MinRoleRelevance: weights.thresholds.p1MinRoleRelevance,
    p1MinDataQuality: weights.thresholds.p1MinDataQuality,
    updatedById: updatedById ?? null,
  };
}

export interface RescoreOptions {
  /** Who triggered the rescore, recorded on the audit entry. */
  actorId?: string;
  reason?: Prisma.ScoreAuditCreateManyInput['reason'];
  detail?: string;
  now?: Date;
}

export interface RescoreSummary {
  campaignId: string;
  scored: number;
  changed: number;
  byPriority: Record<string, number>;
}

/**
 * Rescore every contact on a campaign.
 *
 * Loads the campaign's data once, computes account-level signals, then runs the
 * pure pipeline per contact. Persists only what changed.
 */
export async function rescoreCampaign(
  repo: SignalRepository,
  campaignId: string,
  options: RescoreOptions = {},
): Promise<RescoreSummary> {
  const now = options.now ?? new Date();
  const campaign = await repo.getCampaign(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  const links = await repo.listCampaignContacts(campaignId);
  const contactIds = links.map((link) => link.contactId);

  const [campaignEvents, allContactEvents, countryRules, config] = await Promise.all([
    repo.listEvents({ campaignId, contactIds }),
    repo.listEvents({ contactIds }),
    repo.listCountryRules(),
    repo.getScoringConfig(campaignId),
  ]);

  const weights = weightsFromConfig(config);
  const rulesByCountry = new Map(countryRules.map((rule) => [rule.country, rule]));

  const eventsByContact = new Map<string, EngagementEvent[]>();
  for (const event of campaignEvents) {
    const list = eventsByContact.get(event.contactId) ?? [];
    list.push(event);
    eventsByContact.set(event.contactId, list);
  }
  const historyByContact = new Map<string, EngagementEvent[]>();
  for (const event of allContactEvents) {
    if (event.campaignId === campaignId) continue;
    const list = historyByContact.get(event.contactId) ?? [];
    list.push(event);
    historyByContact.set(event.contactId, list);
  }

  // Account-level signal is computed once per account and displayed separately.
  const signalsByAccount = computeAccountSignals(links, eventsByContact);

  const byPriority: Record<string, number> = {};
  let changed = 0;

  for (const link of links) {
    const events = eventsByContact.get(link.contactId) ?? [];
    const history = historyByContact.get(link.contactId) ?? [];
    const accountSignal = signalsByAccount.get(link.contact.accountId) ?? null;

    const result = qualifyContact({
      account: link.contact.account,
      contact: link.contact,
      campaign,
      events,
      historicalEvents: history,
      complianceRecord: link.contact.complianceRecords[0] ?? null,
      countryRule: rulesByCountry.get(link.contact.country) ?? null,
      weights,
      whyThisContact: link.whyThisContact,
      humanReviewApproved: link.humanReviewStatus === 'APPROVED',
      accountSignal,
      now,
    });

    const { score, decision, gate, compliance, recommendations } = result;
    byPriority[decision.priority] = (byPriority[decision.priority] ?? 0) + 1;

    const priorityChanged = link.priority !== decision.priority;
    const scoreChanged = link.totalScore !== score.totalScore;

    // A human decision is never overwritten by a rescore.
    const humanDecided = ['APPROVED', 'REJECTED', 'DOWNGRADED'].includes(link.humanReviewStatus);
    const humanReviewStatus = humanDecided
      ? link.humanReviewStatus
      : decision.humanReviewRequired
        ? 'PENDING'
        : 'NOT_REQUIRED';

    await repo.updateCampaignContact(link.id, {
      fitScore: score.fitScore,
      roleRelevanceScore: score.roleRelevanceScore,
      triggerScore: score.triggerScore,
      engagementScore: score.engagementScore,
      dataQualityScore: score.dataQualityScore,
      attendanceLikelihoodScore: score.attendanceLikelihoodScore,
      engagementBonusScore: score.engagementBonusScore,
      totalScore: score.totalScore,
      priority: decision.priority,
      relevanceGatePassed: gate.passed,
      complianceGatePassed: compliance.status === 'PASS',
      gateFailureReasons: gate.blockingFailures,
      gateWarnings: [...gate.reviewFailures, ...gate.advisories, ...compliance.warnings],
      humanReviewRequired: decision.humanReviewRequired,
      humanReviewStatus,
      humanReviewReasons: decision.humanReviewReasons,
      whyThisContactDraft: recommendations.whyThisContact,
      recommendedChannel: recommendations.recommendedChannel,
      recommendedNextAction: recommendations.recommendedNextAction,
      callerOpening: recommendations.callerOpening,
      emailAngle: recommendations.emailAngle,
      whatsappRecommendation: recommendations.whatsappRecommendation,
      scoreBreakdown: {
        ...result.score.breakdown,
        priorityReasons: decision.reasons,
        gateChecks: gate.checks,
        compliance: {
          status: compliance.status,
          allowedChannels: compliance.allowedChannels,
          blockedChannels: compliance.blockedChannels,
          missingFields: compliance.missingFields,
          summary: compliance.summary,
        },
        accountSignal,
      } as unknown as Prisma.InputJsonValue,
      lastScoredAt: now,
    });

    if (priorityChanged || scoreChanged) {
      changed += 1;
      await repo.createScoreAudit({
        campaignContactId: link.id,
        previousTotal: link.priority === 'UNSCORED' ? null : link.totalScore,
        newTotal: score.totalScore,
        previousPriority: link.priority === 'UNSCORED' ? null : link.priority,
        newPriority: decision.priority,
        reason: options.reason ?? (link.priority === 'UNSCORED' ? 'INITIAL_SCORE' : 'RESCORE'),
        detail: options.detail ?? decision.reasons[0] ?? null,
        breakdown: result.score.breakdown as unknown as Prisma.InputJsonValue,
        changedById: options.actorId ?? null,
      });
    }
  }

  return { campaignId, scored: links.length, changed, byPriority };
}

/** Rescore a single campaign contact, e.g. after an engagement event. */
export async function rescoreCampaignContact(
  repo: SignalRepository,
  campaignContactId: string,
  options: RescoreOptions = {},
): Promise<void> {
  const link = await repo.getCampaignContact(campaignContactId);
  if (!link) throw new Error(`Campaign contact ${campaignContactId} not found`);
  await rescoreCampaign(repo, link.campaignId, options);
}

/** Account-level engagement rollups for every account present in the campaign. */
export function computeAccountSignals(
  links: CampaignContactFull[],
  eventsByContact: Map<string, EngagementEvent[]>,
): Map<string, AccountSignal> {
  const grouped = new Map<string, CampaignContactFull[]>();
  for (const link of links) {
    const list = grouped.get(link.contact.accountId) ?? [];
    list.push(link);
    grouped.set(link.contact.accountId, list);
  }

  const signals = new Map<string, AccountSignal>();
  for (const [accountId, group] of grouped) {
    signals.set(accountId, computeAccountSignal({
      accountId,
      companyName: group[0]!.contact.account.companyName,
      contacts: group.map((link) => ({
        contactId: link.contactId,
        events: eventsByContact.get(link.contactId) ?? [],
      })),
    }));
  }
  return signals;
}
