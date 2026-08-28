'use client';

import { ActionForm, SubmitValueButton } from '@/components/forms/action-form';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { logCallAction } from '@/server/actions/outreach';

export interface OutcomeOption {
  value: string;
  label: string;
  tone: 'positive' | 'neutral' | 'negative';
  hint: string;
}

const TONE_VARIANT = { positive: 'success', neutral: 'outline', negative: 'danger' } as const;

/**
 * Call outcome capture.
 *
 * One press records the outcome, writes the engagement event, moves the status
 * and schedules the follow-up. Outcomes are grouped by tone so the caller's
 * hand goes to the right third of the row without reading every label.
 */
export function CallForm({
  campaignContactId, outcomes, disabled, disabledReason,
}: {
  campaignContactId: string;
  outcomes: OutcomeOption[];
  disabled: boolean;
  disabledReason?: string;
}) {
  const groups: Array<{ tone: OutcomeOption['tone']; heading: string }> = [
    { tone: 'positive', heading: 'Progressed' },
    { tone: 'neutral', heading: 'No contact' },
    { tone: 'negative', heading: 'Closed out' },
  ];

  return (
    <ActionForm action={logCallAction} className="space-y-4">
      <input type="hidden" name="campaignContactId" value={campaignContactId} />

      {disabled ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-900">
          <Icon name="ban" className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
          {disabledReason ?? 'Calling is not permitted for this contact.'}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Call notes" htmlFor="callNotes" hint="Their words, not a summary.">
          <Textarea id="callNotes" name="notes" rows={4} placeholder="What they said, in their words." />
        </Field>

        <div className="space-y-4">
          <Field label="Next action" htmlFor="nextAction">
            <Input id="nextAction" name="nextAction" placeholder="Send the agenda and follow up Thursday" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Next follow-up" htmlFor="nextFollowUpAt">
              <Input id="nextFollowUpAt" name="nextFollowUpAt" type="date" />
            </Field>
            <Field label="Duration (s)" htmlFor="durationSeconds">
              <Input id="durationSeconds" name="durationSeconds" type="number" min={0} placeholder="240" />
            </Field>
          </div>
        </div>
      </div>

      <fieldset disabled={disabled} className="border-t border-line pt-4 disabled:opacity-60">
        <legend className="sr-only">Call outcome</legend>
        <p className="eyebrow mb-3">Record the outcome</p>

        <div className="grid gap-3 sm:grid-cols-3">
          {groups.map((group) => {
            const items = outcomes.filter((outcome) => outcome.tone === group.tone);
            if (items.length === 0) return null;
            return (
              <div key={group.tone} className="rounded-lg border border-line bg-surface-sunk p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-navy-400">
                  {group.heading}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((outcome) => (
                    <SubmitValueButton
                      key={outcome.value}
                      name="outcome"
                      value={outcome.value}
                      variant={TONE_VARIANT[outcome.tone]}
                      size="sm"
                      title={outcome.hint}
                      pendingLabel="Saving…"
                    >
                      {outcome.label}
                    </SubmitValueButton>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </ActionForm>
  );
}
