'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field, Input } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Alert, Progress } from '@/components/ui/misc';
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

const BAND_ICON = {
  A: 'building', B: 'user', C: 'spark', D: 'trendUp', E: 'shield', F: 'clock',
} as const;

/**
 * Scoring weight editor.
 *
 * The running total is live and the save button stays disabled until the six
 * bands add up to exactly 100, so an invalid configuration cannot be submitted
 * by accident. The server validates again regardless.
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

          {/* ------------------------------------------------- running total */}
          <div
            className={cn(
              'sticky top-[68px] z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4 shadow-sm backdrop-blur-sm transition-colors',
              valid ? 'border-success-200 bg-success-50/95' : 'border-danger-200 bg-danger-50/95',
            )}
          >
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white',
                  valid ? 'bg-success-600' : 'bg-danger-600',
                )}
              >
                <Icon name={valid ? 'check' : 'alert'} className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-md font-semibold text-navy-900">
                  <span className="tabular">{total}</span>
                  <span className="text-navy-500"> / 100 points allocated</span>
                </p>
                <p className="mt-0.5 text-xs text-navy-600">
                  {valid
                    ? `Weights are valid for ${campaignName}.`
                    : 'Adjust the components until the six bands add up to exactly 100.'}
                </p>
                <div className="mt-2 w-56">
                  <Progress
                    value={Math.min(total, 100)}
                    max={100}
                    tone={valid ? 'success' : 'danger'}
                    label={`${total} of 100 points allocated`}
                  />
                </div>
              </div>
            </div>

            <SubmitButton disabled={!valid} icon="refresh" pendingLabel="Saving and rescoring…">
              Save and rescore the campaign
            </SubmitButton>
          </div>

          {state.fieldErrors ? (
            <Alert tone="danger" title="These bands do not balance">
              <ul className="list-disc space-y-1 pl-5">
                {Object.entries(state.fieldErrors).map(([path, message]) => <li key={path}>{message}</li>)}
              </ul>
            </Alert>
          ) : null}

          {/* -------------------------------------------------------- bands */}
          <div className="grid gap-4 xl:grid-cols-2">
            {bands.map((band) => {
              const subtotal = bandTotal(band);
              return (
                <section key={band.band} className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
                  <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-navy-800">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-500">
                        <Icon name={BAND_ICON[band.band as keyof typeof BAND_ICON] ?? 'dot'} className="h-4 w-4" />
                      </span>
                      <span className="truncate">
                        <span className="text-navy-400">{band.band}.</span> {band.label}
                      </span>
                    </h3>
                    <span className="tabular shrink-0 rounded-md bg-navy-100 px-2 py-1 text-sm font-semibold text-navy-800">
                      {subtotal}
                    </span>
                  </header>

                  <ul className="divide-y divide-line">
                    {band.components.map((component) => (
                      <li key={component.code} className="flex items-start gap-4 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`component.${component.code}`}
                            className="text-sm font-medium text-navy-800"
                          >
                            {component.label}
                          </label>
                          <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{component.description}</p>
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
                          className="tabular h-9 w-16 shrink-0 rounded-md border border-line-strong bg-surface px-2 text-right text-base font-semibold text-navy-900 shadow-xs transition-colors hover:border-navy-300 focus:border-brand-500 focus:outline-none focus:ring-[3px] focus:ring-brand-500/15"
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {/* --------------------------------------------------- thresholds */}
          <section className="rounded-xl border border-line bg-surface p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-navy-800">Priority thresholds</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-navy-500">
              The two P1 minimums are what stop seniority alone from producing a P1. Role relevance cannot
              reach 18 without confirmed direct ownership of the campaign problem.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {[
                ['p1', 'P1 minimum total', thresholds.p1],
                ['p2', 'P2 minimum total', thresholds.p2],
                ['p3', 'P3 minimum total', thresholds.p3],
                ['p1MinRoleRelevance', 'P1 min. role relevance', thresholds.p1MinRoleRelevance],
                ['p1MinDataQuality', 'P1 min. data quality', thresholds.p1MinDataQuality],
              ].map(([name, label, value]) => (
                <Field
                  key={String(name)}
                  label={String(label)}
                  htmlFor={String(name)}
                  error={state.fieldErrors?.[String(name)]}
                >
                  <Input
                    id={String(name)} name={String(name)} type="number" min={0} max={100}
                    defaultValue={Number(value)} className="tabular font-semibold"
                  />
                </Field>
              ))}
            </div>
          </section>
        </>
      )}
    </ActionForm>
  );
}
