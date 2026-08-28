'use client';

import { useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { selectCampaignAction } from '@/server/actions/campaign-context';

/**
 * Workspace context.
 *
 * Every screen in the product is scoped to one campaign, so the switcher sits
 * in the top bar as a persistent statement of context rather than a filter
 * buried in a page.
 */
export function CampaignSwitcher({
  campaigns, selectedId,
}: {
  campaigns: Array<{ id: string; name: string; clientBrand: string; status: string }>;
  selectedId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const selected = campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0];

  return (
    <form ref={formRef} action={selectCampaignAction} className="min-w-0">
      <label htmlFor="campaignId" className="sr-only">Active campaign</label>
      <div className="group relative flex min-w-0 items-center gap-2.5 rounded-lg border border-line bg-surface py-1.5 pl-2.5 pr-8 shadow-xs transition-colors hover:border-navy-300 focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-500/15">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700"
        >
          <Icon name="campaigns" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-navy-400">
            {selected?.clientBrand ?? 'Campaign'}
          </span>
          <span className="block truncate text-xs font-medium leading-tight text-navy-800">
            {selected?.name ?? 'Select a campaign'}
          </span>
        </span>
        <Icon
          name="chevronDown"
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
        />
        <select
          id="campaignId"
          name="campaignId"
          defaultValue={selectedId ?? ''}
          onChange={() => formRef.current?.requestSubmit()}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Active campaign"
        >
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.clientBrand} — {campaign.name}
              {campaign.status !== 'ACTIVE' ? ` (${campaign.status.toLowerCase()})` : ''}
            </option>
          ))}
        </select>
      </div>
      <noscript>
        <button type="submit" className="mt-1 rounded bg-navy-100 px-2 py-1 text-xs">Switch campaign</button>
      </noscript>
    </form>
  );
}
