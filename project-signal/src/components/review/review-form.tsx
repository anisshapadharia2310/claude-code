'use client';

import { ActionForm, SubmitValueButton } from '@/components/forms/action-form';
import { CheckboxField, Field, FieldGroup, FormActions, Select, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { applyReviewAction } from '@/server/actions/review';

const ROLE_CATEGORIES = [
  'DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'TECHNICAL_EVALUATOR',
  'BUSINESS_INFLUENCER', 'PROCUREMENT', 'END_USER', 'PERIPHERAL', 'UNKNOWN',
];

/**
 * The researcher's working form.
 *
 * Corrections come first and the verdict comes last, because the point of the
 * queue is to fix the record so the next score is right — not simply to pass
 * judgement on the current one.
 */
export function ReviewForm({
  campaignContactId, contact, canApprove,
}: {
  campaignContactId: string;
  contact: {
    roleCategory: string;
    roleConfidence: string;
    directProblemResponsibility: boolean;
    ownsBudget: boolean;
    influencesDecision: boolean;
    roleRelevanceNotes: string | null;
    triggerVerification: string;
    whyThisContact: string | null;
    whyThisContactDraft: string | null;
    reviewNotes: string | null;
    priority: string;
  };
  canApprove: boolean;
}) {
  const isP1 = contact.priority === 'P1';

  return (
    <ActionForm action={applyReviewAction} className="space-y-6">
      {(state) => (
        <>
          <input type="hidden" name="campaignContactId" value={campaignContactId} />

          <FieldGroup
            title="Role classification"
            description="What the engine read, and what you know to be true. These corrections change the record."
            columns={2}
          >
            <Field label="Role category" htmlFor={`role-${campaignContactId}`}>
              <Select id={`role-${campaignContactId}`} name="roleCategory" defaultValue={contact.roleCategory}>
                {ROLE_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase())}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Role confidence" htmlFor={`conf-${campaignContactId}`}>
              <Select id={`conf-${campaignContactId}`} name="roleConfidence" defaultValue={contact.roleConfidence}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="UNKNOWN">Unknown</option>
              </Select>
            </Field>

            <Field
              label="Direct problem responsibility"
              htmlFor={`dir-${campaignContactId}`}
              hint="Confirming this is what unlocks the 12-point ownership award."
            >
              <Select
                id={`dir-${campaignContactId}`}
                name="directProblemResponsibility"
                defaultValue={String(contact.directProblemResponsibility)}
              >
                <option value="true">Confirmed: they are accountable</option>
                <option value="false">Not confirmed</option>
              </Select>
            </Field>

            <Field label="Business trigger" htmlFor={`trig-${campaignContactId}`}>
              <Select id={`trig-${campaignContactId}`} name="triggerVerification" defaultValue={contact.triggerVerification}>
                <option value="VERIFIED">Verified with a source</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="FALSE_POSITIVE">False: no such trigger</option>
                <option value="NONE">No trigger recorded</option>
              </Select>
            </Field>

            <Field label="Owns budget" htmlFor={`budget-${campaignContactId}`}>
              <Select id={`budget-${campaignContactId}`} name="ownsBudget" defaultValue={String(contact.ownsBudget)}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>

            <Field label="Influences the decision" htmlFor={`infl-${campaignContactId}`}>
              <Select id={`infl-${campaignContactId}`} name="influencesDecision" defaultValue={String(contact.influencesDecision)}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
          </FieldGroup>

          <FieldGroup title="Evidence" columns={1}>
            <Field
              label={`Why this contact${isP1 ? ' — required to approve a P1' : ''}`}
              htmlFor={`why-${campaignContactId}`}
              required={isP1}
              error={state.fieldErrors?.whyThisContact}
              hint={
                contact.whyThisContactDraft && !contact.whyThisContact
                  ? 'The engine draft is shown as the placeholder. Rewrite it in your own words: a generated sentence never satisfies the P1 rule.'
                  : 'What they own, which trigger you verified, and why now.'
              }
            >
              <Textarea
                id={`why-${campaignContactId}`}
                name="whyThisContact"
                rows={4}
                defaultValue={contact.whyThisContact ?? ''}
                aria-invalid={state.fieldErrors?.whyThisContact ? true : undefined}
                placeholder={contact.whyThisContactDraft ?? 'What they own, which trigger you verified, and why now.'}
              />
            </Field>

            <Field
              label="Research notes"
              htmlFor={`notes-${campaignContactId}`}
              hint="What you checked and where you checked it."
            >
              <Textarea
                id={`notes-${campaignContactId}`}
                name="reviewNotes"
                rows={3}
                defaultValue={contact.reviewNotes ?? ''}
              />
            </Field>

            <Field label="Role relevance notes" htmlFor={`rel-${campaignContactId}`}>
              <Textarea
                id={`rel-${campaignContactId}`}
                name="roleRelevanceNotes"
                rows={2}
                defaultValue={contact.roleRelevanceNotes ?? ''}
              />
            </Field>

            <CheckboxField
              name="markVerifiedNow"
              label="Set the last-verified date to today"
              hint="Clears the freshness warning and restores the data-quality points."
            />
          </FieldGroup>

          <FormActions>
            <SubmitValueButton name="decision" value="SAVE" variant="secondary" size="sm" pendingLabel="Saving…">
              Save notes
            </SubmitValueButton>
            {canApprove ? (
              <SubmitValueButton name="decision" value="APPROVE" variant="success" size="sm" icon="check" pendingLabel="Approving…">
                Approve
              </SubmitValueButton>
            ) : null}
            <SubmitValueButton name="decision" value="DOWNGRADE" variant="outline" size="sm" pendingLabel="Downgrading…">
              Downgrade
            </SubmitValueButton>

            {/* Destructive actions sit apart from the rest. */}
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />
            <SubmitValueButton name="decision" value="REJECT" variant="danger" size="sm" icon="ban" pendingLabel="Rejecting…">
              Reject
            </SubmitValueButton>
          </FormActions>

          {!canApprove ? (
            <p className="flex items-start gap-2 rounded-lg bg-navy-50 px-3 py-2.5 text-xs leading-relaxed text-navy-600">
              <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />
              Approving a P1 is a manager decision. Save your notes and the justification, and a manager will
              approve it.
            </p>
          ) : null}
        </>
      )}
    </ActionForm>
  );
}
