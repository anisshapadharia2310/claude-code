'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { CAMPAIGN_COOKIE } from '../campaign-context';
import { requireUser } from '../auth/guards';

/** Switches the campaign every screen is scoped to. */
export async function selectCampaignAction(formData: FormData): Promise<void> {
  await requireUser();
  const campaignId = String(formData.get('campaignId') ?? '');
  if (!campaignId) return;

  const store = await cookies();
  store.set(CAMPAIGN_COOKIE, campaignId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath('/', 'layout');
}
