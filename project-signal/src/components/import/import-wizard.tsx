'use client';

import { useState, useTransition } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { CheckboxField, Checkbox, Field, Select } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { commitImportAction, parseCsvAction, validateImportAction } from '@/server/actions/import';
import type {
  ColumnMapping, CommitResult, ImportField, ImportValidationResult,
} from '@/server/services/import';

export interface FieldOption {
  field: ImportField;
  label: string;
  required: boolean;
  help: string;
}

type Step = 'upload' | 'map' | 'review' | 'done';

const STEPS: Array<[Step, string, string]> = [
  ['upload', 'Upload', 'Choose a CSV'],
  ['map', 'Map columns', 'Match your headers'],
  ['review', 'Validate', 'Fix or skip rows'],
  ['done', 'Summary', 'Imported and scored'],
];

const STATUS_STYLE: Record<string, string> = {
  VALID: 'border-success-200 bg-success-50 text-success-800',
  DUPLICATE: 'border-warn-200 bg-warn-50 text-warn-800',
  INVALID: 'border-danger-200 bg-danger-50 text-danger-800',
};

/** The four-step import flow. Behaviour is unchanged; only the surface differs. */
export function ImportWizard({
  fields, campaigns,
}: {
  fields: FieldOption[];
  campaigns: Array<{ id: string; name: string; clientBrand: string }>;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [result, setResult] = useState<CommitResult | null>(null);

  const handleFile = async (file: File): Promise<void> => {
    setError(null);
    const content = await file.text();
    setFileName(file.name);
    setText(content);
    startTransition(async () => {
      const response = await parseCsvAction(content);
      if (!response.ok) { setError(response.error ?? 'Could not read the file.'); return; }
      setHeaders(response.headers ?? []);
      setMapping(response.mapping ?? {});
      setPreview(response.preview ?? []);
      setStep('map');
    });
  };

  const runValidation = (): void => {
    setError(null);
    startTransition(async () => {
      const response = await validateImportAction(text, mapping);
      if (!response.ok || !response.result) { setError(response.error ?? 'Validation failed.'); return; }
      setValidation(response.result);
      setSkipped(new Set(response.result.rows.filter((row) => row.status === 'INVALID').map((row) => row.index)));
      setStep('review');
    });
  };

  const runCommit = (): void => {
    if (!validation) return;
    if (campaignIds.length === 0) { setError('Choose at least one campaign.'); return; }
    setError(null);
    const include = validation.rows
      .filter((row) => !skipped.has(row.index))
      .filter((row) => row.status === 'VALID' || (includeDuplicates && row.status === 'DUPLICATE'))
      .map((row) => row.index);

    startTransition(async () => {
      const response = await commitImportAction(text, mapping, include, campaignIds, includeDuplicates);
      if (!response.ok || !response.result) { setError(response.error ?? 'Import failed.'); return; }
      setResult(response.result);
      setStep('done');
    });
  };

  const missingRequired = fields.filter((field) => field.required && !mapping[field.field]);
  const summary = validation?.summary;
  const includedCount = validation
    ? validation.rows.filter((row) => !skipped.has(row.index)
        && (row.status === 'VALID' || (includeDuplicates && row.status === 'DUPLICATE'))).length
    : 0;
  const currentIndex = STEPS.findIndex(([key]) => key === step);

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- stepper */}
      <ol className="flex flex-wrap gap-2 sm:flex-nowrap sm:items-stretch" aria-label="Import steps">
        {STEPS.map(([key, label, caption], index) => {
          const active = key === step;
          const done = currentIndex > index;
          return (
            <li
              key={key}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex flex-1 items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                active ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : done ? 'border-success-200 bg-success-50 text-success-800'
                  : 'border-line bg-surface text-navy-500',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold',
                  active ? 'bg-white/20 text-white'
                    : done ? 'bg-success-600 text-white'
                    : 'bg-navy-100 text-navy-500',
                )}
              >
                {done ? <Icon name="check" className="h-3 w-3" strokeWidth={3} /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{label}</span>
                <span className={cn('block truncate text-[10px]', active ? 'text-white/75' : 'text-navy-400')}>
                  {caption}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {error ? <Alert tone="danger" title="Import problem">{error}</Alert> : null}

      {pending ? (
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <svg viewBox="0 0 16 16" className="h-4 w-4 animate-[spin_700ms_linear_infinite]" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <path d="M8 1.5A6.5 6.5 0 0 1 14.5 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Processing the file…
        </div>
      ) : null}

      {/* ----------------------------------------------------------- upload */}
      {step === 'upload' ? (
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            'rounded-xl border-2 border-dashed bg-surface px-6 py-14 text-center transition-colors',
            dragging ? 'border-brand-500 bg-brand-50' : 'border-line-strong',
          )}
        >
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="import" className="h-6 w-6" />
          </span>
          <p className="text-md font-semibold text-navy-900">Upload a target account list</p>
          <p className="mx-auto mt-1.5 max-w-lg text-sm leading-relaxed text-navy-500">
            CSV only. Drop the file here, or choose it below. Required columns: company name, contact first
            name, contact last name, job title, industry, country, and either a work email or a phone number.
          </p>

          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-700">
            <Icon name="import" className="h-4 w-4" />
            Choose a CSV file
            <input
              id="csv"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>

          <p className="mt-5 text-xs text-navy-500">
            Need a starting point?{' '}
            <a href="/sample-import.csv" download className="font-medium text-brand-700 underline underline-offset-2">
              Download the sample CSV
            </a>
          </p>
        </div>
      ) : null}

      {/* -------------------------------------------------------------- map */}
      {step === 'map' ? (
        <div className="rounded-xl border border-line bg-surface shadow-xs">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-navy-800">Map your columns</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-navy-500">
                <Icon name="document" className="h-3.5 w-3.5" />
                {fileName} · {headers.length} columns detected. Guesses are pre-filled; correct anything wrong.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep('upload')}>
              Choose another file
            </Button>
          </header>

          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <Field
                key={field.field}
                label={field.label}
                htmlFor={`map-${field.field}`}
                required={field.required}
                hint={field.help || undefined}
              >
                <Select
                  id={`map-${field.field}`}
                  value={mapping[field.field] ?? ''}
                  aria-invalid={field.required && !mapping[field.field] ? true : undefined}
                  onChange={(event) => setMapping((current) => ({
                    ...current,
                    [field.field]: event.target.value || undefined,
                  }))}
                >
                  <option value="">Not in this file</option>
                  {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </Select>
              </Field>
            ))}
          </div>

          {missingRequired.length > 0 ? (
            <div className="px-5 pb-4">
              <Alert tone="warning" title="Required columns are not mapped">
                Map these before continuing: {missingRequired.map((field) => field.label).join(', ')}.
              </Alert>
            </div>
          ) : null}

          {preview.length > 0 ? (
            <div className="border-t border-line">
              <p className="eyebrow px-5 pb-2 pt-4">First rows in the file</p>
              <TableWrap className="max-h-64 border-y border-line">
                <Table>
                  <thead><tr>{headers.map((header) => <Th key={header}>{header}</Th>)}</tr></thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <Tr key={index}>
                        {headers.map((header, cell) => (
                          <Td key={header} className="whitespace-nowrap text-xs">{row[cell] ?? ''}</Td>
                        ))}
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-line bg-surface-sunk px-5 py-4">
            <Button
              type="button" icon="check" onClick={runValidation}
              disabled={pending || missingRequired.length > 0}
            >
              Validate {validation ? 'again' : 'rows'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ----------------------------------------------------------- review */}
      {step === 'review' && validation && summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {([
              ['Rows', summary.total, 'default'],
              ['Valid', summary.valid, 'success'],
              ['Invalid', summary.invalid, 'danger'],
              ['Duplicates', summary.duplicates, 'warning'],
              ['No email', summary.missingEmail, 'default'],
              ['No phone', summary.missingPhone, 'default'],
              ['Role unclear', summary.unverifiedRole, 'warning'],
            ] as const).map(([label, value, tone]) => (
              <div key={label} className="rounded-xl border border-line bg-surface px-4 py-3 shadow-xs">
                <p className="eyebrow">{label}</p>
                <p className={cn(
                  'tabular mt-1.5 text-2xl font-semibold',
                  tone === 'success' ? 'text-success-700'
                    : tone === 'danger' ? 'text-danger-700'
                    : tone === 'warning' ? 'text-warn-700' : 'text-navy-900',
                )}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {summary.unknownCountries.length > 0 ? (
            <Alert tone="warning" title="Unrecognised countries">
              These values could not be normalized, so time zone and compliance rules will be missing:{' '}
              {summary.unknownCountries.join(', ')}.
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-navy-800">Row report</h2>
                <p className="mt-0.5 text-xs text-navy-500">
                  Uncheck any row to skip it. Invalid rows are skipped by default.
                </p>
              </div>
              <CheckboxField
                checked={includeDuplicates}
                onChange={(event) => setIncludeDuplicates(event.target.checked)}
                label="Import duplicates anyway"
                hint="They are written with a duplicate flag and cannot score above Reject."
                className="text-xs"
              />
            </header>

            <TableWrap className="max-h-[28rem]">
              <Table>
                <thead>
                  <tr>
                    <Th className="w-12">Use</Th>
                    <Th className="w-16" numeric>Line</Th>
                    <Th className="w-28">Status</Th>
                    <Th className="min-w-[220px]">Contact</Th>
                    <Th className="min-w-[170px]">Company</Th>
                    <Th className="min-w-[280px]">Issues</Th>
                  </tr>
                </thead>
                <tbody>
                  {validation.rows.map((row) => {
                    const included = !skipped.has(row.index)
                      && (row.status === 'VALID' || (includeDuplicates && row.status === 'DUPLICATE'));
                    return (
                      <Tr key={row.index} selected={included}>
                        <Td>
                          <Checkbox
                            checked={included}
                            disabled={row.status === 'INVALID' || (row.status === 'DUPLICATE' && !includeDuplicates)}
                            aria-label={`Include line ${row.line}`}
                            onChange={() => setSkipped((current) => {
                              const next = new Set(current);
                              if (next.has(row.index)) next.delete(row.index); else next.add(row.index);
                              return next;
                            })}
                          />
                        </Td>
                        <Td numeric className="text-xs text-navy-500">{row.line}</Td>
                        <Td>
                          <span className={cn(
                            'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]',
                            STATUS_STYLE[row.status],
                          )}>
                            {row.status}
                          </span>
                        </Td>
                        <Td className="text-xs">
                          {row.normalized ? (
                            <>
                              <p className="font-medium text-navy-800">
                                {row.normalized.firstName} {row.normalized.lastName}
                              </p>
                              <p className="text-navy-500">{row.normalized.jobTitle}</p>
                              <p className="font-mono text-[10px] text-navy-400">{row.normalized.normalizedJobTitle}</p>
                            </>
                          ) : (
                            <span className="italic text-navy-400">not normalized</span>
                          )}
                        </Td>
                        <Td className="text-xs">
                          {row.normalized?.companyName ?? '—'}
                          <p className="text-navy-500">{row.normalized?.country ?? ''}</p>
                        </Td>
                        <Td className="text-xs">
                          {row.errors.map((message) => (
                            <p key={message} className="flex items-start gap-1.5 text-danger-700">
                              <Icon name="close" className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2.5} />{message}
                            </p>
                          ))}
                          {row.duplicate ? (
                            <p className="flex items-start gap-1.5 text-warn-800">
                              <Icon name="alert" className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
                              {row.duplicate.detail}
                            </p>
                          ) : null}
                          {row.warnings.map((message) => (
                            <p key={message} className="flex items-start gap-1.5 text-navy-500">
                              <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />{message}
                            </p>
                          ))}
                          {row.errors.length + row.warnings.length === 0 && !row.duplicate ? (
                            <span className="inline-flex items-center gap-1 text-success-700">
                              <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />Clean
                            </span>
                          ) : null}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-navy-800">Import into</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-navy-500">
              Imported contacts are scored against every campaign you choose. The same person can be a P1 on
              one campaign and a reject on another.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => {
                const chosen = campaignIds.includes(campaign.id);
                return (
                  <label
                    key={campaign.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm transition-colors',
                      chosen ? 'border-brand-400 bg-brand-50' : 'border-line bg-surface hover:border-navy-300',
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={chosen}
                      onChange={(event) => setCampaignIds((current) =>
                        event.target.checked
                          ? [...current, campaign.id]
                          : current.filter((id) => id !== campaign.id))}
                    />
                    <span className="min-w-0">
                      <span className="block text-2xs font-semibold uppercase tracking-[0.06em] text-navy-400">
                        {campaign.clientBrand}
                      </span>
                      <span className="block text-xs font-medium leading-snug text-navy-800">{campaign.name}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button type="button" icon="check" onClick={runCommit} disabled={pending || includedCount === 0}>
                Import {includedCount} row{includedCount === 1 ? '' : 's'} and score
              </Button>
              <Button type="button" variant="ghost" icon="chevronLeft" onClick={() => setStep('map')}>
                Back to mapping
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- done */}
      {step === 'done' && result ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex items-center gap-4 border-b border-line bg-success-50 px-6 py-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-600 text-white">
              <Icon name="check" className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="text-md font-semibold text-navy-900">Import complete</h2>
              <p className="mt-0.5 text-xs text-navy-600">
                Every imported contact has been scored and gated.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {([
              ['Accounts created', result.accountsCreated],
              ['Contacts created', result.contactsCreated],
              ['Campaign memberships', result.membershipsCreated],
              ['Rows skipped', result.skipped],
            ] as const).map(([label, value]) => (
              <div key={label} className="bg-surface px-5 py-4">
                <dt className="eyebrow">{label}</dt>
                <dd className="tabular mt-1.5 text-2xl font-semibold text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="px-6 py-5">
            <p className="max-w-3xl text-sm leading-relaxed text-navy-600">
              New records start unverified, so most will appear in the research review queue until a
              researcher confirms the role and the contact details.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/review" icon="review">Open the review queue</ButtonLink>
              <Button
                type="button"
                variant="outline"
                icon="import"
                onClick={() => {
                  setStep('upload'); setText(''); setValidation(null); setResult(null);
                  setHeaders([]); setMapping({}); setCampaignIds([]); setSkipped(new Set()); setFileName('');
                }}
              >
                Import another file
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
