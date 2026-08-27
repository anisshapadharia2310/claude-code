'use server';
import { revalidatePath } from 'next/cache';
import { Prisma, ScoreChangeSource } from '@prisma/client';
import { z } from 'zod';
import { requireApiCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { scoringWeightsSchema, validateWeights } from '@/lib/domain/scoring/weights';
import { rescoreCampaign } from '@/lib/services/scoring-service';

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/**
 * Saves per-campaign scoring weights. The Zod schema refuses any configuration
 * that does not total exactly 100 points, so campaigns stay comparable.
 */
export async function updateScoringWeightsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireApiCapability('scoring:configure');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const campaignId = String(formData.get('campaignId'));
  const raw = String(formData.get('weights') ?? '');

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: 'The weights payload was not valid JSON.' };
  }

  const validation = validateWeights(parsedJson);
  if (!validation.valid) {
    return { error: validation.errors.join(' ') };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { scoringWeights: scoringWeightsSchema.parse(parsedJson) as unknown as Prisma.InputJsonValue },
  });

  const result = await rescoreCampaign(campaignId, {
    source: ScoreChangeSource.WEIGHT_CHANGE,
    reason: 'Scoring weights were changed by an administrator.',
    changedById: user.id,
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath('/dashboard');
  return {
    ok: true,
    message: `Weights saved and ${result.scored} contacts re-scored.`,
  };
}

const costSchema = z.object({
  campaignId: z.string().min(1),
  campaignCost: z.coerce.number().min(0, 'Cost cannot be negative.'),
  currency: z.string().min(3).max(3),
});

/** Campaign cost drives cost-per-verified-attendee on the dashboard. */
export async function updateCampaignCostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireApiCapability('campaign:manage');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = costSchema.safeParse({
    campaignId: formData.get('campaignId'),
    campaignCost: formData.get('campaignCost'),
    currency: formData.get('currency') ?? 'USD',
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.campaign.update({
    where: { id: parsed.data.campaignId },
    data: {
      campaignCost: new Prisma.Decimal(parsed.data.campaignCost),
      currency: parsed.data.currency.toUpperCase(),
    },
  });

  revalidatePath(`/campaigns/${parsed.data.campaignId}`);
  revalidatePath('/dashboard');
  return { ok: true, message: 'Campaign cost updated.' };
}

/** Re-runs the engine over a whole campaign, e.g. after research updates. */
export async function rescoreCampaignAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireApiCapability('campaign:manage');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const campaignId = String(formData.get('campaignId'));
  const result = await rescoreCampaign(campaignId, {
    source: ScoreChangeSource.SCORING_ENGINE,
    reason: 'Manual re-score requested.',
    changedById: user.id,
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath('/dashboard');
  revalidatePath('/contacts');
  return { ok: true, message: `${result.scored} contacts re-scored.` };
}

/** Marks which role categories count as relevant for a campaign. */
export async function updateRelevantRolesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireApiCapability('campaign:manage');
  } catch (error) {
    return { error: (error as Error).message };
  }

  const campaignId = String(formData.get('campaignId'));
  const roles = formData.getAll('relevantRoleCategories').map(String);
  const terms = String(formData.get('problemOwnershipTerms') ?? '')
    .split(/[,\n]/)
    .map((term) => term.trim())
    .filter(Boolean);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      relevantRoleCategories: roles as never,
      problemOwnershipTerms: terms,
    },
  });

  const result = await rescoreCampaign(campaignId, {
    source: ScoreChangeSource.SCORING_ENGINE,
    reason: 'Campaign relevance definition changed.',
    changedById: user.id,
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: `Relevance definition saved; ${result.scored} contacts re-scored.` };
}
