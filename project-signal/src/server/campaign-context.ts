import 'server-only';
import { cookies } from 'next/headers';
import type { Campaign } from '@prisma/client';
import { getRepository } from './repo';

const COOKIE_NAME = 'signal_campaign';

/**
 * The campaign the user is currently working in.
 *
 * Held in a cookie rather than a query parameter so that every screen stays in
 * the same campaign context without threading a parameter through every link.
 * Falls back to the first active campaign.
 */
export async function getSelectedCampaign(): Promise<Campaign | null> {
  const repo = await getRepository();
  const campaigns = await repo.listCampaigns();
  if (campaigns.length === 0) return null;

  const store = await cookies();
  const selected = store.get(COOKIE_NAME)?.value;
  const match = campaigns.find((campaign) => campaign.id === selected);
  if (match) return match;

  return campaigns.find((campaign) => campaign.status === 'ACTIVE') ?? campaigns[0]!;
}

export async function getSelectedCampaignId(): Promise<string | null> {
  return (await getSelectedCampaign())?.id ?? null;
}

export const CAMPAIGN_COOKIE = COOKIE_NAME;
