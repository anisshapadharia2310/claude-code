import { Prisma, ScoreChangeSource, type Priority } from '@prisma/client';
import { prisma } from '../db';
import { evaluateComplianceGate } from '../domain/compliance-gate';
import { scoreContact } from '../domain/scoring/engine';
import { resolveWeights } from '../domain/scoring/weights';
import type { ScoringResult } from '../domain/types';

/**
 * Loads everything one CampaignContact needs to be scored. The Prisma models
 * were designed to satisfy the domain input shapes directly, so no mapping layer
 * is needed - only assembly.
 */
const campaignContactInclude = {
  contact: {
    include: {
      account: true,
      complianceRecords: { orderBy: { updatedAt: 'desc' as const }, take: 1 },
      engagementEvents: true,
    },
  },
  campaign: true,
} satisfies Prisma.CampaignContactInclude;

type LoadedCampaignContact = Prisma.CampaignContactGetPayload<{
  include: typeof campaignContactInclude;
}>;

/** Country rules are small and read constantly; cache them per request batch. */
async function loadCountryRules(countries: string[]) {
  const rules = await prisma.countryComplianceRule.findMany({
    where: { country: { in: Array.from(new Set(countries)) } },
  });
  return new Map(rules.map((rule) => [rule.country, rule]));
}

export function evaluate(
  record: LoadedCampaignContact,
  countryRule: Awaited<ReturnType<typeof loadCountryRules>> extends Map<string, infer R>
    ? R | undefined
    : never,
  now = new Date(),
): ScoringResult {
  const { contact, campaign } = record;
  const compliance = evaluateComplianceGate({
    contact,
    record: contact.complianceRecords[0] ?? null,
    countryRule: countryRule ?? null,
  });

  return scoreContact({
    account: contact.account,
    contact,
    campaign,
    compliance,
    events: contact.engagementEvents
      .filter((event) => event.campaignId === campaign.id)
      .map((event) => ({
        eventType: event.eventType,
        eventDate: event.eventDate,
        metadata: event.metadata as Record<string, unknown> | null,
      })),
    whyThisContact: record.whyThisContact,
    weights: resolveWeights(campaign.scoringWeights),
    now,
  });
}

export interface RescoreOptions {
  source: ScoreChangeSource;
  reason: string;
  changedById?: string | null;
  /** Skip writing an audit row when nothing actually changed. */
  auditOnlyOnChange?: boolean;
}

function persistencePayload(result: ScoringResult) {
  return {
    fitScore: result.components.fit,
    roleRelevanceScore: result.components.roleRelevance,
    triggerScore: result.components.trigger,
    engagementScore: result.components.engagement,
    dataQualityScore: result.components.dataQuality,
    attendanceLikelihoodScore: result.components.attendance,
    engagementBonus: result.engagementBonus,
    totalScore: result.totalScore,
    priority: result.priority,
    relevanceGatePassed: result.relevance.passed,
    complianceGatePassed: result.compliance.passed,
    scoreExplanation: {
      lines: result.explanation,
      priorityReasons: result.priorityReasons,
      baseTotal: result.baseTotal,
      engagementBonus: result.engagementBonus,
    } as unknown as Prisma.InputJsonValue,
    gateResults: {
      relevance: result.relevance,
      compliance: result.compliance,
    } as unknown as Prisma.InputJsonValue,
    humanReviewRequired: result.humanReviewRequired,
    recommendedChannel: result.playbook.recommendedChannel,
    recommendedNextAction: result.playbook.recommendedNextAction,
    callerOpening: result.playbook.callerOpening,
    emailAngle: result.playbook.emailAngle,
    whatsappRecommended: result.playbook.whatsappRecommended,
    surfaceLevelMatch: result.surfaceLevelMatch,
  };
}

/** Scores one CampaignContact, persists the result, and records an audit row. */
export async function rescoreCampaignContact(
  campaignContactId: string,
  options: RescoreOptions,
): Promise<ScoringResult> {
  const record = await prisma.campaignContact.findUniqueOrThrow({
    where: { id: campaignContactId },
    include: campaignContactInclude,
  });
  const rules = await loadCountryRules([record.contact.country]);
  const result = evaluate(record, rules.get(record.contact.country));

  const changed =
    record.totalScore !== result.totalScore || record.priority !== result.priority;

  await prisma.$transaction(async (tx) => {
    await tx.campaignContact.update({
      where: { id: campaignContactId },
      data: {
        ...persistencePayload(result),
        humanReviewStatus:
          result.humanReviewRequired && record.humanReviewStatus === 'NOT_REQUIRED'
            ? 'PENDING'
            : record.humanReviewStatus,
      },
    });

    if (changed || !options.auditOnlyOnChange) {
      await tx.scoreAudit.create({
        data: {
          campaignContactId,
          source: options.source,
          reason: options.reason,
          previousTotal: record.totalScore,
          newTotal: result.totalScore,
          previousPriority: record.priority,
          newPriority: result.priority,
          delta: {
            fit: [record.fitScore, result.components.fit],
            roleRelevance: [record.roleRelevanceScore, result.components.roleRelevance],
            trigger: [record.triggerScore, result.components.trigger],
            engagement: [record.engagementScore, result.components.engagement],
            dataQuality: [record.dataQualityScore, result.components.dataQuality],
            attendance: [record.attendanceLikelihoodScore, result.components.attendance],
            engagementBonus: [record.engagementBonus, result.engagementBonus],
          } as unknown as Prisma.InputJsonValue,
          changedById: options.changedById ?? null,
        },
      });
    }
  });

  return result;
}

/** Re-scores every contact in a campaign, e.g. after the weights change. */
export async function rescoreCampaign(
  campaignId: string,
  options: RescoreOptions,
): Promise<{ scored: number; byPriority: Record<Priority, number> }> {
  const records = await prisma.campaignContact.findMany({
    where: { campaignId },
    include: campaignContactInclude,
  });
  const rules = await loadCountryRules(records.map((r) => r.contact.country));

  const byPriority = {} as Record<Priority, number>;
  const now = new Date();

  for (const record of records) {
    const result = evaluate(record, rules.get(record.contact.country), now);
    byPriority[result.priority] = (byPriority[result.priority] ?? 0) + 1;

    const changed = record.totalScore !== result.totalScore || record.priority !== result.priority;
    await prisma.campaignContact.update({
      where: { id: record.id },
      data: {
        ...persistencePayload(result),
        humanReviewStatus:
          result.humanReviewRequired && record.humanReviewStatus === 'NOT_REQUIRED'
            ? 'PENDING'
            : record.humanReviewStatus,
      },
    });
    if (changed) {
      await prisma.scoreAudit.create({
        data: {
          campaignContactId: record.id,
          source: options.source,
          reason: options.reason,
          previousTotal: record.totalScore,
          newTotal: result.totalScore,
          previousPriority: record.priority,
          newPriority: result.priority,
          changedById: options.changedById ?? null,
        },
      });
    }
  }

  return { scored: records.length, byPriority };
}

/** Adds contacts to a campaign and scores them immediately. */
export async function enrollContacts(
  campaignId: string,
  contactIds: string[],
  options: Omit<RescoreOptions, 'auditOnlyOnChange'>,
): Promise<{ enrolled: number; skipped: number }> {
  const existing = await prisma.campaignContact.findMany({
    where: { campaignId, contactId: { in: contactIds } },
    select: { contactId: true },
  });
  const existingIds = new Set(existing.map((e) => e.contactId));
  const toCreate = contactIds.filter((id) => !existingIds.has(id));

  if (toCreate.length > 0) {
    await prisma.campaignContact.createMany({
      data: toCreate.map((contactId) => ({ campaignId, contactId })),
      skipDuplicates: true,
    });
  }

  const created = await prisma.campaignContact.findMany({
    where: { campaignId, contactId: { in: toCreate } },
    select: { id: true },
  });
  for (const record of created) {
    await rescoreCampaignContact(record.id, options);
  }

  return { enrolled: toCreate.length, skipped: contactIds.length - toCreate.length };
}

/** Recomputes a score without persisting - used by the "explain" preview. */
export async function previewScore(campaignContactId: string): Promise<ScoringResult> {
  const record = await prisma.campaignContact.findUniqueOrThrow({
    where: { id: campaignContactId },
    include: campaignContactInclude,
  });
  const rules = await loadCountryRules([record.contact.country]);
  return evaluate(record, rules.get(record.contact.country));
}
