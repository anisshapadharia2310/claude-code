'use client';
import { useActionState, useMemo, useState } from 'react';
import { updateScoringWeightsAction, type ActionState } from '@/lib/actions/campaign-actions';
import { DEFAULT_WEIGHTS, COMPONENT_LABELS } from '@/lib/domain/scoring/weights';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { FormMessage } from '@/components/form-message';
import { cn } from '@/lib/utils';

type Weights = typeof DEFAULT_WEIGHTS;

const GROUPS: Array<{ key: keyof Weights; label: string; component: keyof typeof COMPONENT_LABELS }> = [
  { key: 'companyFit', label: 'A. Company fit', component: 'A_FIT' },
  { key: 'roleRelevance', label: 'B. Contact-role relevance', component: 'B_ROLE' },
  { key: 'trigger', label: 'C. Current business trigger', component: 'C_TRIGGER' },
  { key: 'engagement', label: 'D. Engagement and intent', component: 'D_ENGAGEMENT' },
  { key: 'dataQuality', label: 'E. Data quality and reachability', component: 'E_DATA_QUALITY' },
  { key: 'attendance', label: 'F. Attendance likelihood', component: 'F_ATTENDANCE' },
];

const CRITERION_LABELS: Record<string, string> = {
  industryMatch: 'Target industry match',
  geographyMatch: 'Target geography match',
  sizeBand: 'Target employee or revenue band',
  technologyOrModel: 'Relevant technology or business model',
  namedOrExistingClient: 'Named account or existing relationship',
  directOwner: 'Direct owner of the campaign problem',
  operationalOwnerOrInfluencer: 'Operational owner or strong influencer',
  seniority: 'Relevant seniority',
  budgetOrDecisionInfluence: 'Budget or decision influence',
  hiring: 'Relevant hiring activity',
  transformation: 'Active transformation project',
  expansionOrMerger: 'Expansion, merger, or restructuring',
  leadershipChange: 'Relevant leadership change',
  regulatoryPressure: 'Regulatory or operational pressure',
  statedPriority: 'Publicly stated priority',
  positiveEmailReply: 'Positive email reply',
  whitepaperDownload: 'White-paper download',
  webinarRegistration: 'Webinar registration',
  resourceClick: 'Relevant resource click',
  previousAttendanceOrMeeting: 'Previous attendance or meeting',
  verifiedTitle: 'Current verified job title',
  verifiedEmail: 'Verified work email',
  validPhone: 'Valid phone number',
  countryAndTimeZone: 'Correct country and time zone',
  contactSource: 'Contact source recorded',
  lastVerified: 'Last verification date recorded',
  consentRecorded: 'Consent status recorded',
  previousAttendance: 'Previous event attendance',
  earlyRegistration: 'Early registration',
  convenientLocalTime: 'Convenient local event time',
  explicitLinkRequest: 'Explicit request for the link',
};

const initialState: ActionState = {};

/**
 * Weights editor with a live total. The form cannot be submitted unless the
 * configuration totals exactly 100 - the same rule the server re-checks.
 */
export function WeightsEditor({ campaignId, initial }: { campaignId: string; initial: Weights }) {
  const [weights, setWeights] = useState<Weights>(initial);
  const [state, formAction, pending] = useActionState(updateScoringWeightsAction, initialState);

  const componentTotals = useMemo(
    () =>
      Object.fromEntries(
        GROUPS.map((group) => [
          group.key,
          Object.values(weights[group.key] as Record<string, number>).reduce((a, b) => a + b, 0),
        ]),
      ) as Record<keyof Weights, number>,
    [weights],
  );
  const total = useMemo(
    () => Object.values(componentTotals).reduce((a, b) => a + b, 0),
    [componentTotals],
  );
  const valid = total === 100;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="weights" value={JSON.stringify(weights)} />

      <div
        className={cn(
          'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
          valid ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-red-300 bg-red-50 text-red-900',
        )}
      >
        <span className="font-medium">Total weight</span>
        <span className="numeric font-semibold">
          {total} / 100 {valid ? '' : '- must total exactly 100'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {GROUPS.map((group) => (
          <fieldset key={group.key} className="rounded-md border border-navy-200 p-3">
            <legend className="px-1 text-xs font-semibold text-navy-900">
              {group.label}{' '}
              <span className="numeric font-normal text-muted-foreground">
                ({componentTotals[group.key]} pts)
              </span>
            </legend>
            <div className="space-y-1.5">
              {Object.entries(weights[group.key] as Record<string, number>).map(([criterion, value]) => (
                <div key={criterion} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`${group.key}-${criterion}`} className="flex-1 font-normal">
                    {CRITERION_LABELS[criterion] ?? criterion}
                  </Label>
                  <Input
                    id={`${group.key}-${criterion}`}
                    type="number"
                    min={0}
                    max={100}
                    value={value}
                    className="numeric h-7 w-16 text-right"
                    onChange={(event) =>
                      setWeights((current) => ({
                        ...current,
                        [group.key]: {
                          ...(current[group.key] as Record<string, number>),
                          [criterion]: Number(event.target.value || 0),
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <FormMessage state={state} />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!valid || pending}>
          {pending ? 'Saving and re-scoring...' : 'Save weights and re-score'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
          Reset to default
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Saving re-scores every contact in this campaign and writes an audit entry for each score that
        changes.
      </p>
    </form>
  );
}
