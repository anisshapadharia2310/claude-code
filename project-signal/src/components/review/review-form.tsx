'use client';

import { ActionForm, SubmitValueButton } from '@/components/forms/action-form';
import { Checkbox, FieldError, Label, Select, Textarea } from '@/components/ui/form';
import { applyReviewAction } from '@/server/actions/review';

const ROLE_CATEGORIES = [
  'DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'TECHNICAL_EVALUATOR',
  'BUSINESS_INFLUENCER', 'PROCUREMENT', 'END_USER', 'PERIPHERAL', 'UNKNOWN',
];

/**
 * The researcher's working form.
 *
 * Corrections to the underlying record are made here, not only a verdict: the
 * point of the queue is to fix the data, so the next score is right.
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
  return (
    <ActionForm action={applyReviewAction} className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="campaignContactId" value={campaignContactId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`role-${campaignContactId}`}>Role category</Label>
              <Select id={`role-${campaignContactId}`} name="roleCategory" defaultValue={contact.roleCategory}>
                {ROLE_CATEGORIES.map((value) => (
                  <option key={value} value={value}>{value.replace(/_/g, ' ').toLowerCase()}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`conf-${campaignContactId}`}>Role confidence</Label>
              <Select id={`conf-${campaignContactId}`} name="roleConfidence" defaultValue={contact.roleConfidence}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="UNKNOWN">Unknown</option>
              </Select>
            </div>
            <div>
              <Label htmlFor={`dir-${campaignContactId}`}>Direct problem responsibility</Label>
              <Select id={`dir-${campaignContactId}`} name="directProblemResponsibility"
                defaultValue={String(contact.directProblemResponsibility)}>
                <option value="true">Confirmed: they are accountable</option>
                <option value="false">Not confirmed</option>
              </Select>
            </div>
            <div>
              <Label htmlFor={`trig-${campaignContactId}`}>Business trigger</Label>
              <Select id={`trig-${campaignContactId}`} name="triggerVerification" defaultValue={contact.triggerVerification}>
                <option value="VERIFIED">Verified with a source</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="FALSE_POSITIVE">False: no such trigger</option>
                <option value="NONE">No trigger recorded</option>
              </Select>
            </div>
            <div>
              <Label htmlFor={`budget-${campaignContactId}`}>Owns budget</Label>
              <Select id={`budget-${campaignContactId}`} name="ownsBudget" defaultValue={String(contact.ownsBudget)}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </div>
            <div>
              <Label htmlFor={`infl-${campaignContactId}`}>Influences the decision</Label>
              <Select id={`infl-${campaignContactId}`} name="influencesDecision" defaultValue={String(contact.influencesDecision)}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor={`why-${campaignContactId}`}>
              Why this contact {contact.priority === 'P1' ? '(required to approve a P1)' : ''}
            </Label>
            <Textarea
              id={`why-${campaignContactId}`}
              name="whyThisContact"
              rows={4}
              defaultValue={contact.whyThisContact ?? ''}
              placeholder={contact.whyThisContactDraft ?? 'What they own, which trigger you verified, and why now.'}
            />
            <FieldError>{state.fieldErrors?.whyThisContact}</FieldError>
            {contact.whyThisContactDraft && !contact.whyThisContact ? (
              <p className="mt-1 text-xs text-navy-500">
                Engine draft, shown as the placeholder. Rewrite it in your own words: a generated sentence
                never satisfies the P1 rule.
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor={`notes-${campaignContactId}`}>Research notes</Label>
            <Textarea
              id={`notes-${campaignContactId}`}
              name="reviewNotes"
              rows={3}
              defaultValue={contact.reviewNotes ?? ''}
              placeholder="What you checked and where you checked it."
            />
          </div>

          <div>
            <Label htmlFor={`rel-${campaignContactId}`}>Role relevance notes</Label>
            <Textarea id={`rel-${campaignContactId}`} name="roleRelevanceNotes" rows={2}
              defaultValue={contact.roleRelevanceNotes ?? ''} />
          </div>

          <label className="flex items-center gap-2 text-sm text-navy-700">
            <Checkbox name="markVerifiedNow" />
            Set the last-verified date to today
          </label>

          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <SubmitValueButton name="decision" value="SAVE" variant="secondary" size="sm" pendingLabel="Saving...">
              Save notes
            </SubmitValueButton>
            {canApprove ? (
              <SubmitValueButton name="decision" value="APPROVE" variant="success" size="sm" pendingLabel="Approving...">
                Approve
              </SubmitValueButton>
            ) : null}
            <SubmitValueButton name="decision" value="DOWNGRADE" variant="outline" size="sm" pendingLabel="Downgrading...">
              Downgrade
            </SubmitValueButton>
            <SubmitValueButton name="decision" value="REJECT" variant="danger" size="sm" pendingLabel="Rejecting...">
              Reject
            </SubmitValueButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
