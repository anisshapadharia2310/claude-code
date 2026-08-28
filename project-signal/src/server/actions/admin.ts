'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { COMPONENT_DEFINITIONS, validateWeights } from '@/domain/weights';
import type { ScoringWeights } from '@/domain/types';
import { assertPermission } from '../auth/guards';
import { hashPassword } from '../auth/password';
import { getRepository } from '../repo';
import { configFromWeights, rescoreCampaign, weightsFromConfig } from '../services/scoring';
import { fieldErrorsFrom, type ActionState } from './types';

/**
 * Save per-campaign scoring weights.
 * Rejected unless the six bands still add up to 100 and each band's components
 * add up to that band's maximum.
 */
export async function updateScoringWeightsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('editScoringWeights');
    const campaignId = String(formData.get('campaignId') ?? '');
    if (!campaignId) return { error: 'No campaign selected.' };

    const repo = await getRepository();
    const existing = await repo.getScoringConfig(campaignId);
    const weights: ScoringWeights = weightsFromConfig(existing);

    const readInt = (name: string, fallback: number): number => {
      const raw = formData.get(name);
      if (raw === null || raw === '') return fallback;
      const parsed = Number.parseInt(String(raw), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    for (const definition of COMPONENT_DEFINITIONS) {
      weights.componentMax[definition.code] = readInt(
        `component.${definition.code}`,
        weights.componentMax[definition.code] ?? definition.defaultPoints,
      );
    }
    // Band maxima follow their components, so an admin edits one number, not two.
    for (const band of ['A', 'B', 'C', 'D', 'E', 'F'] as const) {
      weights.bandMax[band] = COMPONENT_DEFINITIONS
        .filter((definition) => definition.band === band)
        .reduce((sum, definition) => sum + (weights.componentMax[definition.code] ?? 0), 0);
    }

    weights.thresholds = {
      p1: readInt('p1', weights.thresholds.p1),
      p2: readInt('p2', weights.thresholds.p2),
      p3: readInt('p3', weights.thresholds.p3),
      p1MinRoleRelevance: readInt('p1MinRoleRelevance', weights.thresholds.p1MinRoleRelevance),
      p1MinDataQuality: readInt('p1MinDataQuality', weights.thresholds.p1MinDataQuality),
    };

    const validation = validateWeights(weights);
    if (!validation.valid) {
      return {
        error: `Weights are not valid. Total is ${validation.total} of 100.`,
        fieldErrors: Object.fromEntries(validation.issues.map((issue) => [issue.path, issue.message])),
      };
    }

    await repo.upsertScoringConfig(campaignId, configFromWeights(weights, user.id));
    const summary = await rescoreCampaign(repo, campaignId, {
      actorId: user.id,
      reason: 'WEIGHT_CHANGE',
      detail: 'Scoring weights updated.',
    });

    revalidatePath('/', 'layout');
    return {
      ok: true,
      message: `Weights saved and ${summary.scored} contacts rescored. ${summary.changed} changed.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the weights.' };
  }
}

const campaignSchema = z.object({
  campaignId: z.string().min(1),
  campaignCost: z.coerce.number().min(0).max(100_000_000).optional(),
  campaignCurrency: z.string().trim().length(3).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
});

export async function updateCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertPermission('editCampaign');
    const parsed = campaignSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const repo = await getRepository();
    await repo.updateCampaign(parsed.data.campaignId, {
      ...(parsed.data.campaignCost !== undefined ? { campaignCost: parsed.data.campaignCost } : {}),
      ...(parsed.data.campaignCurrency ? { campaignCurrency: parsed.data.campaignCurrency.toUpperCase() } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    });

    revalidatePath('/', 'layout');
    return { ok: true, message: 'Campaign updated.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update the campaign.' };
  }
}

const countryRuleSchema = z.object({
  country: z.string().trim().min(2),
  permittedChannels: z.string().optional(),
  prohibitedChannels: z.string().optional(),
  requiresExplicitOptIn: z.string().optional(),
  whatsappRequiresOptIn: z.string().optional(),
  requiresLawfulBasis: z.string().optional(),
  requiresNotice: z.string().optional(),
  consentValidityDays: z.string().optional(),
  policyNotes: z.string().max(2000).optional(),
});

const CHANNELS = ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'LINKEDIN', 'POST'] as const;
type Channel = (typeof CHANNELS)[number];

function parseChannels(value: string | undefined): Channel[] {
  if (!value) return [];
  return value.split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry): entry is Channel => (CHANNELS as readonly string[]).includes(entry));
}

export async function updateCountryRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertPermission('editCompliance');
    const parsed = countryRuleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const days = parsed.data.consentValidityDays ? Number.parseInt(parsed.data.consentValidityDays, 10) : null;
    const repo = await getRepository();
    await repo.upsertCountryRule(parsed.data.country, {
      permittedChannels: parseChannels(parsed.data.permittedChannels),
      prohibitedChannels: parseChannels(parsed.data.prohibitedChannels),
      requiresExplicitOptIn: parsed.data.requiresExplicitOptIn === 'on',
      whatsappRequiresOptIn: parsed.data.whatsappRequiresOptIn === 'on',
      requiresLawfulBasis: parsed.data.requiresLawfulBasis === 'on',
      requiresNotice: parsed.data.requiresNotice === 'on',
      consentValidityDays: Number.isFinite(days) ? days : null,
      policyNotes: parsed.data.policyNotes || null,
    });

    // Compliance changes can flip a contact between REJECT, HOLD and workable.
    const campaigns = await repo.listCampaigns();
    for (const campaign of campaigns) {
      await rescoreCampaign(repo, campaign.id, {
        reason: 'COMPLIANCE_CHANGE',
        detail: `Country rule updated for ${parsed.data.country}.`,
      });
    }

    revalidatePath('/compliance');
    revalidatePath('/', 'layout');
    return { ok: true, message: `Rules for ${parsed.data.country} saved and all campaigns rescored.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the rule.' };
  }
}

const complianceRecordSchema = z.object({
  contactId: z.string().min(1),
  country: z.string().trim().min(2),
  consentStatus: z.enum(['EXPLICIT_OPT_IN', 'SOFT_OPT_IN', 'LEGITIMATE_INTEREST', 'NOT_CAPTURED', 'OPT_OUT', 'DO_NOT_CONTACT']),
  consentSource: z.string().max(300).optional(),
  consentDate: z.string().optional(),
  lawfulBasis: z.enum(['CONSENT', 'LEGITIMATE_INTEREST', 'CONTRACT', 'LEGAL_OBLIGATION', 'NOT_DETERMINED']),
  noticeProvided: z.string().optional(),
  optOutStatus: z.enum(['NONE', 'EMAIL_OPT_OUT', 'PHONE_OPT_OUT', 'WHATSAPP_OPT_OUT', 'GLOBAL_OPT_OUT']),
  allowedChannels: z.string().optional(),
  blockedChannels: z.string().optional(),
  complianceNotes: z.string().max(2000).optional(),
});

export async function updateComplianceRecordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('viewCompliance');
    const parsed = complianceRecordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const repo = await getRepository();
    await repo.upsertComplianceRecord(parsed.data.contactId, {
      country: parsed.data.country,
      consentStatus: parsed.data.consentStatus,
      consentSource: parsed.data.consentSource || null,
      consentDate: parsed.data.consentDate ? new Date(parsed.data.consentDate) : null,
      lawfulBasis: parsed.data.lawfulBasis,
      noticeProvided: parsed.data.noticeProvided === 'on',
      optOutStatus: parsed.data.optOutStatus,
      allowedChannels: parseChannels(parsed.data.allowedChannels),
      blockedChannels: parseChannels(parsed.data.blockedChannels),
      complianceNotes: parsed.data.complianceNotes || null,
      reviewedAt: new Date(),
      reviewedById: user.id,
    });
    await repo.updateContact(parsed.data.contactId, { consentStatus: parsed.data.consentStatus });

    const campaigns = await repo.listCampaigns();
    for (const campaign of campaigns) {
      await rescoreCampaign(repo, campaign.id, {
        actorId: user.id,
        reason: 'COMPLIANCE_CHANGE',
        detail: 'Contact compliance record updated.',
      });
    }

    revalidatePath('/compliance');
    revalidatePath(`/contacts/${parsed.data.contactId}`);
    return { ok: true, message: 'Compliance record saved.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the record.' };
  }
}

const userSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  role: z.enum(['ADMIN', 'MANAGER', 'RESEARCHER', 'CALLER']),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
});

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertPermission('manageUsers');
    const parsed = userSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const repo = await getRepository();
    if (await repo.getUserByEmail(parsed.data.email)) {
      return { error: 'A user with that email already exists.', fieldErrors: { email: 'Already in use.' } };
    }

    await repo.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: hashPassword(parsed.data.password),
    });

    revalidatePath('/admin/users');
    return { ok: true, message: `${parsed.data.name} added as ${parsed.data.role.toLowerCase()}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the user.' };
  }
}

export async function updateUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await assertPermission('manageUsers');
    const id = String(formData.get('userId') ?? '');
    const role = String(formData.get('role') ?? '');
    const isActive = formData.get('isActive');
    if (!id) return { error: 'No user selected.' };
    if (id === actor.id && role && role !== actor.role) {
      return { error: 'You cannot change your own role. Ask another administrator.' };
    }

    const repo = await getRepository();
    await repo.updateUser(id, {
      ...(role ? { role: role as 'ADMIN' | 'MANAGER' | 'RESEARCHER' | 'CALLER' } : {}),
      ...(isActive !== null ? { isActive: isActive === 'on' } : {}),
    });

    revalidatePath('/admin/users');
    return { ok: true, message: 'User updated.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update the user.' };
  }
}
