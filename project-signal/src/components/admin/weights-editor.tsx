'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { FieldError, Input, Label } from '@/components/ui/form';
import { Alert } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { updateScoringWeightsAction } from '@/server/actions/admin';

export interface WeightComponent {
  code: string;
  band: string;
  label: string;
  description: string;
  points: number;
}

export interface BandGroup {
  band: string;
  label: string;
  components: WeightComponent[];
}

/**
 * Scoring weight editor.
 *
 * The running total is shown live and the save button is disabled until the six
 * bands add up to 100, so an invalid configuration cannot be submitted by
 * accident. The server validates again regardless.
 */
export function WeightsEditor({
  campaignId, campaignName, bands, thresholds,
}: {
  campaignId: string;
  campaignName: string;
  bands: BandGroup[];
  thresholds: { p1: number; p2: number; p3: number; p1MinRoleRelevance: number; p1MinDataQuality: number };
}) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(bands.flatMap((band) => band.components.map((component) => [component.code, component.points]))),
  );

  const bandTotal = (band: BandGroup): number =>
    band.components.reduce((sum, component) => sum + (values[component.code] ?? 0), 0);
  const total = bands.reduce((sum, band) => sum + bandTotal(band), 0);
  const valid = total === 100;

  return (
    <ActionForm action={updateScoringWeightsAction} className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="campaignId" value={campaignId} />

          <div className={cn(
            'sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3',
            valid ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50',
          )}>
            <div>
              <p className="text-sm font-semibold text-navy-900">
                Total: <span className="tabular">{total}</span> / 100
              </p>
              <p className="text-xs text-navy-600">
                {valid
                  ? `Weights are valid for ${campaignName}.`
                  : `Adjust the components until the six bands add up to exactly 100.`}
              </p>
            </div>
            <SubmitButton disabled={!valid} pendingLabel="Saving and rescoring...">
              Save and rescore the campaign
            </SubmitButton>
          </div>

          {state.fieldErrors ? (
            <Alert tone="danger" title="These bands do not balance">
              <ul className="list-disc pl-5">
                {Object.entries(state.fieldErrors).map(([path, message]) => <li key={path}>{message}</li>)}
              </ul>
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {bands.map((band) => (
              <section key={band.band} className="rounded-lg border border-line bg-white">
                <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <h3 className="text-sm font-semibold text-navy-800">{band.band}. {band.label}</h3>
                  <span className="tabular text-sm font-semibold text-navy-700">{bandTotal(band)}</span>
                </header>
                <ul className="divide-y divide-line">
                  {band.components.map((component) => (
                    <li key={component.code} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`component.${component.code}`} className="text-sm font-medium text-navy-800">
                          {component.label}
                        </label>
                        <p className="text-xs leading-relaxed text-navy-500">{component.description}</p>
                      </div>
                      <input
                        id={`component.${component.code}`}
                        name={`component.${component.code}`}
                        type="number"
                        min={0}
                        max={100}
                        value={values[component.code] ?? 0}
                        onChange={(event) => setValues((current) => ({
                          ...current,
                          [component.code]: Number.parseInt(event.target.value || '0', 10),
                        }))}
                        className="tabular h-8 w-16 shrink-0 rounded-md border border-navy-200 px-2 text-right text-sm"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <section className="rounded-lg border border-line bg-white p-4">
            <h3 className="text-sm font-semibold text-navy-800">Priority thresholds</h3>
            <p className="mt-1 text-xs text-navy-500">
              The two P1 minimums are what stop seniority alone from producing a P1. Role relevance cannot
              reach 18 without confirmed direct ownership of the campaign problem.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ['p1', 'P1 minimum total', thresholds.p1],
                ['p2', 'P2 minimum total', thresholds.p2],
                ['p3', 'P3 minimum total', thresholds.p3],
                ['p1MinRoleRelevance', 'P1 minimum role relevance', thresholds.p1MinRoleRelevance],
                ['p1MinDataQuality', 'P1 minimum data quality', thresholds.p1MinDataQuality],
              ].map(([name, label, value]) => (
                <div key={String(name)}>
                  <Label htmlFor={String(name)}>{label}</Label>
                  <Input id={String(name)} name={String(name)} type="number" min={0} max={100} defaultValue={Number(value)} />
                  <FieldError>{state.fieldErrors?.[String(name)]}</FieldError>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </ActionForm>
  );
}
