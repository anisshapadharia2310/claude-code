'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox, Label, Select } from '@/components/ui/form';
import { Alert, Progress } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  commitImportAction, parseCsvAction, validateImportAction,
} from '@/server/actions/import';
import type { ColumnMapping, ImportField, ImportValidationResult } from '@/server/services/import';
import type { CommitResult } from '@/server/services/import';

export interface FieldOption {
  field: ImportField;
  label: string;
  required: boolean;
  help: string;
}

type Step = 'upload' | 'map' | 'review' | 'done';

const STEPS: Array<[Step, string]> = [
  ['upload', 'Upload'],
  ['map', 'Map columns'],
  ['review', 'Validate and fix'],
  ['done', 'Summary'],
];

export function ImportWizard({
  fields, campaigns,
}: {
  fields: FieldOption[];
  campaigns: Array<{ id: string; name: string; clientBrand: string }>;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-2" aria-label="Import steps">
        {STEPS.map(([key, label], index) => {
          const active = key === step;
          const done = STEPS.findIndex(([s]) => s === step) > index;
          return (
            <li key={key} className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium',
              active ? 'border-brand-600 bg-brand-600 text-white'
                : done ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-line bg-white text-navy-500',
            )}>
              <span className="tabular">{index + 1}</span> {label}
            </li>
          );
        })}
      </ol>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {pending ? <Progress value={60} label="Working" /> : null}

      {step === 'upload' ? (
        <div className="rounded-lg border border-dashed border-navy-300 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-navy-800">Upload a target account list</p>
          <p className="mx-auto mt-1 max-w-lg text-xs text-navy-500">
            CSV only. Required columns: company name, contact first name, contact last name, job title,
            industry, country, and either a work email or a phone number.
          </p>
          <input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            className="mx-auto mt-4 block w-full max-w-sm text-sm text-navy-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <p className="mt-4 text-xs text-navy-500">
            Need a starting point? <a href="/sample-import.csv" download className="text-brand-700 underline">
              Download the sample CSV
            </a>
          </p>
        </div>
      ) : null}

      {step === 'map' ? (
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-sm font-semibold text-navy-800">Map your columns</h2>
          <p className="mt-1 text-xs text-navy-500">
            {fileName} &middot; {headers.length} columns detected. Guesses are pre-filled; correct anything wrong.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div key={field.field}>
                <Label htmlFor={`map-${field.field}`}>
                  {field.label}{field.required ? <span className="text-rose-600"> *</span> : null}
                </Label>
                <Select
                  id={`map-${field.field}`}
                  value={mapping[field.field] ?? ''}
                  onChange={(event) => setMapping((current) => ({
                    ...current,
                    [field.field]: event.target.value || undefined,
                  }))}
                >
                  <option value="">Not in this file</option>
                  {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </Select>
                {field.help ? <p className="mt-1 text-[11px] text-navy-500">{field.help}</p> : null}
              </div>
            ))}
          </div>

          {missingRequired.length > 0 ? (
            <Alert tone="warning" className="mt-4">
              Map these before continuing: {missingRequired.map((field) => field.label).join(', ')}.
            </Alert>
          ) : null}

          {preview.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">First rows</p>
              <TableWrap className="rounded border border-line">
                <Table>
                  <thead><tr>{headers.map((header) => <Th key={header}>{header}</Th>)}</tr></thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <Tr key={index}>{headers.map((header, cell) => <Td key={header} className="text-xs">{row[cell] ?? ''}</Td>)}</Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={runValidation} disabled={pending || missingRequired.length > 0}>
              Validate {validation ? 'again' : 'rows'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('upload')}>Choose another file</Button>
          </div>
        </div>
      ) : null}

      {step === 'review' && validation && summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              ['Rows', summary.total, ''],
              ['Valid', summary.valid, 'text-emerald-700'],
              ['Invalid', summary.invalid, 'text-rose-700'],
              ['Duplicates', summary.duplicates, 'text-amber-700'],
              ['No email', summary.missingEmail, 'text-navy-600'],
              ['No phone', summary.missingPhone, 'text-navy-600'],
              ['Role unclear', summary.unverifiedRole, 'text-amber-700'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="rounded-lg border border-line bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-navy-500">{label}</p>
                <p className={cn('tabular mt-1 text-2xl font-semibold', tone || 'text-navy-900')}>{value}</p>
              </div>
            ))}
          </div>

          {summary.unknownCountries.length > 0 ? (
            <Alert tone="warning" title="Unrecognised countries">
              These values could not be normalized, so time zone and compliance rules will be missing:{' '}
              {summary.unknownCountries.join(', ')}.
            </Alert>
          ) : null}

          <div className="rounded-lg border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div>
                <h2 className="text-sm font-semibold text-navy-800">Row report</h2>
                <p className="text-xs text-navy-500">
                  Uncheck any row to skip it. Invalid rows are skipped by default.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-navy-700">
                <Checkbox checked={includeDuplicates} onChange={(event) => setIncludeDuplicates(event.target.checked)} />
                Import duplicates anyway (flagged as duplicates)
              </label>
            </div>
            <TableWrap className="max-h-[26rem]">
              <Table>
                <thead>
                  <tr>
                    <Th className="w-10">Use</Th>
                    <Th className="w-16">Line</Th>
                    <Th className="w-24">Status</Th>
                    <Th>Contact</Th>
                    <Th>Company</Th>
                    <Th>Issues</Th>
                  </tr>
                </thead>
                <tbody>
                  {validation.rows.map((row) => {
                    const included = !skipped.has(row.index)
                      && (row.status === 'VALID' || (includeDuplicates && row.status === 'DUPLICATE'));
                    return (
                      <Tr key={row.index}>
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
                        <Td className="tabular text-xs">{row.line}</Td>
                        <Td>
                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                            row.status === 'VALID' ? 'bg-emerald-100 text-emerald-800'
                              : row.status === 'DUPLICATE' ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800',
                          )}>
                            {row.status}
                          </span>
                        </Td>
                        <Td className="text-xs">
                          {row.normalized
                            ? <>
                                <p className="font-medium text-navy-800">{row.normalized.firstName} {row.normalized.lastName}</p>
                                <p className="text-navy-500">{row.normalized.jobTitle}</p>
                                <p className="font-mono text-[10px] text-navy-400">{row.normalized.normalizedJobTitle}</p>
                              </>
                            : <span className="text-navy-400">not normalized</span>}
                        </Td>
                        <Td className="text-xs">
                          {row.normalized?.companyName ?? '-'}
                          <p className="text-navy-500">{row.normalized?.country ?? ''}</p>
                        </Td>
                        <Td className="max-w-md text-xs">
                          {row.errors.map((message) => (
                            <p key={message} className="text-rose-700">{message}</p>
                          ))}
                          {row.duplicate ? <p className="text-amber-800">{row.duplicate.detail}</p> : null}
                          {row.warnings.map((message) => (
                            <p key={message} className="text-navy-500">{message}</p>
                          ))}
                          {row.errors.length + row.warnings.length === 0 && !row.duplicate
                            ? <span className="text-navy-400">None</span> : null}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-sm font-semibold text-navy-800">Import into</h2>
            <p className="text-xs text-navy-500">
              Imported contacts are scored against every campaign you choose. The same person can be a P1 on
              one campaign and a reject on another.
            </p>
            <div className="mt-3 space-y-2">
              {campaigns.map((campaign) => (
                <label key={campaign.id} className="flex items-center gap-2 text-sm text-navy-700">
                  <Checkbox
                    checked={campaignIds.includes(campaign.id)}
                    onChange={(event) => setCampaignIds((current) =>
                      event.target.checked
                        ? [...current, campaign.id]
                        : current.filter((id) => id !== campaign.id))}
                  />
                  {campaign.clientBrand} &mdash; {campaign.name}
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={runCommit} disabled={pending || includedCount === 0}>
                Import {includedCount} row{includedCount === 1 ? '' : 's'} and score
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep('map')}>Back to mapping</Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'done' && result ? (
        <div className="rounded-lg border border-line bg-white p-6">
          <h2 className="text-base font-semibold text-navy-900">Import complete</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><dt className="text-xs uppercase tracking-wide text-navy-500">Accounts created</dt><dd className="tabular text-2xl font-semibold">{result.accountsCreated}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-navy-500">Contacts created</dt><dd className="tabular text-2xl font-semibold">{result.contactsCreated}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-navy-500">Campaign memberships</dt><dd className="tabular text-2xl font-semibold">{result.membershipsCreated}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-navy-500">Rows skipped</dt><dd className="tabular text-2xl font-semibold">{result.skipped}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-navy-600">
            Every imported contact has been scored and gated. New records start unverified, so most will
            appear in the research review queue until a researcher confirms the role and the contact details.
          </p>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={() => {
              setStep('upload'); setText(''); setValidation(null); setResult(null);
              setHeaders([]); setMapping({}); setCampaignIds([]); setSkipped(new Set());
            }}>
              Import another file
            </Button>
            <a href="/review" className="inline-flex h-9 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
              Open the review queue
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
