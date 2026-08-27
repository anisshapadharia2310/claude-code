'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, Label } from '@/components/ui/input';

/** Switches the campaign context without losing the other query parameters. */
export function CampaignPicker({
  campaigns,
  value,
  basePath,
  includeAll = false,
}: {
  campaigns: Array<{ id: string; name: string }>;
  value: string;
  basePath: string;
  includeAll?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="campaign-picker" className="whitespace-nowrap">
        Campaign
      </Label>
      <Select
        id="campaign-picker"
        className="w-64"
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          if (event.target.value) params.set('campaign', event.target.value);
          else params.delete('campaign');
          router.push(`${basePath}?${params.toString()}`);
        }}
      >
        {includeAll ? <option value="">All campaigns</option> : null}
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
