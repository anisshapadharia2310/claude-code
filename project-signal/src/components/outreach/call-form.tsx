'use client';

import { ActionForm, SubmitValueButton } from '@/components/forms/action-form';
import { Input, Label, Textarea } from '@/components/ui/form';
import { logCallAction } from '@/server/actions/outreach';

export interface OutcomeOption {
  value: string;
  label: string;
  tone: 'positive' | 'neutral' | 'negative';
  hint: string;
}

const TONE_VARIANT = {
  positive: 'success', neutral: 'outline', negative: 'danger',
} as const;

/**
 * Call outcome buttons.
 *
 * One click records the outcome, writes the engagement event, moves the status
 * and schedules the follow-up. Notes are optional but always offered.
 */
export function CallForm({
  campaignContactId, outcomes, disabled, disabledReason,
}: {
  campaignContactId: string;
  outcomes: OutcomeOption[];
  disabled: boolean;
  disabledReason?: string;
}) {
  return (
    <ActionForm action={logCallAction} className="space-y-3">
      <input type="hidden" name="campaignContactId" value={campaignContactId} />

      {disabled ? (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {disabledReason ?? 'Calling is not permitted for this contact.'}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="callNotes">Call notes</Label>
          <Textarea id="callNotes" name="notes" rows={3} placeholder="What they said, in their words." />
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="nextAction">Next action</Label>
            <Input id="nextAction" name="nextAction" placeholder="Send the agenda and follow up Thursday" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="nextFollowUpAt">Next follow-up</Label>
              <Input id="nextFollowUpAt" name="nextFollowUpAt" type="date" />
            </div>
            <div className="w-28">
              <Label htmlFor="durationSeconds">Duration (s)</Label>
              <Input id="durationSeconds" name="durationSeconds" type="number" min={0} />
            </div>
          </div>
        </div>
      </div>

      <fieldset disabled={disabled} className="border-t border-line pt-3">
        <legend className="sr-only">Call outcome</legend>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">Record the outcome</p>
        <div className="flex flex-wrap gap-2">
          {outcomes.map((outcome) => (
            <SubmitValueButton
              key={outcome.value}
              name="outcome"
              value={outcome.value}
              variant={TONE_VARIANT[outcome.tone]}
              size="sm"
              title={outcome.hint}
              pendingLabel="Saving..."
            >
              {outcome.label}
            </SubmitValueButton>
          ))}
        </div>
      </fieldset>
    </ActionForm>
  );
}
