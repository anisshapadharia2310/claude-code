'use client';

import { useRef } from 'react';
import { Select } from '@/components/ui/form';
import { selectCampaignAction } from '@/server/actions/campaign-context';

export function CampaignSwitcher({
  campaigns, selectedId,
}: {
  campaigns: Array<{ id: string; name: string; clientBrand: string; status: string }>;
  selectedId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={selectCampaignAction} className="flex items-center gap-2">
      <label htmlFor="campaignId" className="sr-only">Active campaign</label>
      <Select
        id="campaignId"
        name="campaignId"
        defaultValue={selectedId ?? ''}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-8 w-full min-w-52 max-w-xs text-xs"
      >
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.clientBrand} — {campaign.name}
            {campaign.status !== 'ACTIVE' ? ` (${campaign.status.toLowerCase()})` : ''}
          </option>
        ))}
      </Select>
      <noscript>
        <button type="submit" className="rounded bg-navy-100 px-2 py-1 text-xs">Switch</button>
      </noscript>
    </form>
  );
}
