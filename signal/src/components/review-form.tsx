'use client';
import { useActionState, useState } from 'react';
import { DataConfidence, RoleCategory, TriggerVerification } from '@prisma/client';
import { submitReviewAction } from '@/lib/actions/review-actions';
import type { ActionState } from '@/lib/actions/campaign-actions';
import { ROLE_CATEGORY_LABELS } from '@/lib/domain/role-taxonomy';
import { Button } from '@/components/ui/button';
import { Label, Select, Textarea } from '@/components/ui/input';
import { FormMessage } from '@/components/form-message';
import { humanize } from '@/lib/utils';

const initialState: ActionState = {};

/**
 * The researcher's decision form. Approving requires the written justification -
 * the engine will not promote a contact to P1 without one.
 */
export function ReviewForm({
  campaignContactId,
  contact,
}: {
  campaignContactId: string;
  contact: {
    roleCategory: RoleCategory;
    roleConfidence: DataConfidence;
    directProblemResponsibility: boolean;
    ownsBudget: boolean;
    influencesDecision: boolean;
    triggerVerification: TriggerVerification;
    whyThisContact: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(submitReviewAction, initialState);
  const [decision, setDecision] = useState<'APPROVE' | 'DOWNGRADE' | 'REJECT'>('APPROVE');
  const [why, setWhy] = useState(contact.whyThisContact ?? '');

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="campaignContactId" value={campaignContactId} />
      <input type="hidden" name="decision" value={decision} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`role-${campaignContactId}`}>Role category</Label>
          <Select id={`role-${campaignContactId}`} name="roleCategory" defaultValue={contact.roleCategory}>
            {Object.values(RoleCategory).map((role) => (
              <option key={role} value={role}>
                {ROLE_CATEGORY_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`confidence-${campaignContactId}`}>Role confidence</Label>
          <Select id={`confidence-${campaignContactId}`} name="roleConfidence" defaultValue={contact.roleConfidence}>
            {Object.values(DataConfidence).map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`trigger-${campaignContactId}`}>Trigger verification</Label>
          <Select
            id={`trigger-${campaignContactId}`}
            name="triggerVerification"
            defaultValue={contact.triggerVerification}
          >
            {Object.values(TriggerVerification).map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-xs font-medium text-navy-800">Recorded responsibility</legend>
        {[
          ['directProblemResponsibility', 'Owns this problem directly', contact.directProblemResponsibility],
          ['ownsBudget', 'Owns the budget', contact.ownsBudget],
          ['influencesDecision', 'Influences the decision', contact.influencesDecision],
          ['markVerifiedNow', 'Mark verified today', false],
        ].map(([name, label, checked]) => (
          <label key={name as string} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name={name as string}
              defaultChecked={checked as boolean}
              className="h-3.5 w-3.5 rounded border-navy-300"
            />
            {label as string}
          </label>
        ))}
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor={`why-${campaignContactId}`}>
          Why this contact (required to approve for P1)
        </Label>
        <Textarea
          id={`why-${campaignContactId}`}
          name="whyThisContact"
          rows={3}
          value={why}
          onChange={(event) => setWhy(event.target.value)}
          placeholder="What they own, which trigger was found, and where it was verified."
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`notes-${campaignContactId}`}>Research notes</Label>
        <Textarea id={`notes-${campaignContactId}`} name="reviewNotes" rows={2} />
      </div>

      <FormMessage state={state} />

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          variant="success"
          disabled={pending || why.trim().length === 0}
          onClick={() => setDecision('APPROVE')}
        >
          Approve
        </Button>
        <Button type="submit" size="sm" variant="outline" disabled={pending} onClick={() => setDecision('DOWNGRADE')}>
          Downgrade
        </Button>
        <Button type="submit" size="sm" variant="destructive" disabled={pending} onClick={() => setDecision('REJECT')}>
          Reject
        </Button>
        {why.trim().length === 0 ? (
          <span className="self-center text-xs text-muted-foreground">
            Write the justification to enable approval.
          </span>
        ) : null}
      </div>
    </form>
  );
}
