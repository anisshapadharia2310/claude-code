'use client';
import { useActionState } from 'react';
import { RoleCategory } from '@prisma/client';
import {
  rescoreCampaignAction,
  updateCampaignCostAction,
  updateRelevantRolesAction,
  type ActionState,
} from '@/lib/actions/campaign-actions';
import { ROLE_CATEGORY_LABELS } from '@/lib/domain/role-taxonomy';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { FormMessage } from '@/components/form-message';

const initialState: ActionState = {};

export function CampaignCostForm({
  campaignId,
  cost,
  currency,
}: {
  campaignId: string;
  cost: number;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(updateCampaignCostAction, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="campaignCost">Total cost</Label>
          <Input id="campaignCost" name="campaignCost" type="number" min={0} step="0.01" defaultValue={cost} />
        </div>
        <div className="w-24 space-y-1">
          <Label htmlFor="currency">Currency</Label>
          <Select id="currency" name="currency" defaultValue={currency}>
            {['USD', 'EUR', 'GBP', 'CAD', 'AED', 'SAR'].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving...' : 'Save cost'}
      </Button>
    </form>
  );
}

export function RescoreButton({ campaignId }: { campaignId: string }) {
  const [state, formAction, pending] = useActionState(rescoreCampaignAction, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="campaignId" value={campaignId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Re-scoring...' : 'Re-score campaign'}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function RelevanceConfigForm({
  campaignId,
  selected,
  terms,
}: {
  campaignId: string;
  selected: RoleCategory[];
  terms: string[];
}) {
  const [state, formAction, pending] = useActionState(updateRelevantRolesAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-navy-800">Relevant role categories</legend>
        <div className="grid grid-cols-2 gap-1">
          {Object.values(RoleCategory).map((role) => (
            <label key={role} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="relevantRoleCategories"
                value={role}
                defaultChecked={selected.includes(role)}
                className="h-3.5 w-3.5 rounded border-navy-300"
              />
              {ROLE_CATEGORY_LABELS[role]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor="problemOwnershipTerms">
          Problem-ownership phrases (one per line or comma separated)
        </Label>
        <Textarea
          id="problemOwnershipTerms"
          name="problemOwnershipTerms"
          rows={4}
          defaultValue={terms.join('\n')}
        />
        <p className="text-[11px] text-muted-foreground">
          Multi-word phrases are strong evidence. Single ambiguous words are treated as weak and need
          corroboration.
        </p>
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving and re-scoring...' : 'Save and re-score'}
      </Button>
    </form>
  );
}
