'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { IMPORT_COLUMNS, proposeMapping } from '@/lib/domain/import/columns';
import type { ImportPreview, ProcessedRow } from '@/lib/domain/import/process';
import type { CommitImportSummary } from '@/lib/services/import-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'mapping' | 'validate' | 'done';

const STEPS: Array<{ key: Step; label: string }> = [
  { key: 'upload', label: '1. Upload CSV' },
  { key: 'mapping', label: '2. Map columns' },
  { key: 'validate', label: '3. Validate and fix' },
  { key: 'done', label: '4. Summary' },
];

export function ImportWizard({ campaigns }: { campaigns: Array<{ id: string; name: string }> }) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? '');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<CommitImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mappedKeys = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean) as string[]),
    [mapping],
  );
  const unmappedRequired = IMPORT_COLUMNS.filter((c) => c.required && !mappedKeys.has(c.key));
  const missingReachability = !mappedKeys.has('workEmail') && !mappedKeys.has('phoneNumber');

  function handleFile(file: File) {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const fields = parsed.meta.fields ?? [];
        setFileName(file.name);
        setHeaders(fields);
        setRecords(parsed.data);
        setMapping(proposeMapping(fields).mapping);
        setStep('mapping');
      },
      error: (parseError) => setError(parseError.message),
    });
  }

  async function runPreview(rows = records) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: rows, mapping }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Validation failed.');
      setPreview(data);
      setStep('validate');
    } catch (previewError) {
      setError((previewError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          campaignId: campaignId || null,
          records,
          mapping,
          skipRowNumbers: Array.from(skipped),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Import failed.');
      setSummary(data);
      setStep('done');
    } catch (commitError) {
      setError((commitError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** Inline correction: edit a cell, then re-validate. */
  function editCell(rowNumber: number, header: string, value: string) {
    setRecords((current) =>
      current.map((row, index) => (index + 2 === rowNumber ? { ...row, [header]: value } : row)),
    );
  }

  const problemRows = preview?.rows.filter((row) => row.status !== 'VALID') ?? [];

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((entry) => (
          <li
            key={entry.key}
            className={cn(
              'rounded-md border px-3 py-1 text-xs font-medium',
              step === entry.key
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-navy-200 bg-card text-muted-foreground',
            )}
          >
            {entry.label}
          </li>
        ))}
      </ol>

      {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}

      {/* --- Step 1: upload ------------------------------------------------- */}
      {step === 'upload' ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload a target account list</CardTitle>
            <CardDescription>
              Required columns: company name, contact first name, contact last name, job title,
              industry, country, and either a work email or a phone number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Optional columns are also recognised: city, revenue, employee count, department,
              LinkedIn URL, technology, contact source, existing relationship and consent status.{' '}
              <a href="/sample-import.csv" className="text-primary underline">
                Download a sample CSV
              </a>
              .
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* --- Step 2: mapping ------------------------------------------------ */}
      {step === 'mapping' ? (
        <Card>
          <CardHeader>
            <CardTitle>Map your columns</CardTitle>
            <CardDescription>
              {records.length} rows found in {fileName}. Mappings were proposed from the headers -
              correct anything that is wrong.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-xs font-medium text-navy-900" title={header}>
                    {header}
                  </span>
                  <Select
                    aria-label={`Map column ${header}`}
                    value={mapping[header] ?? ''}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, [header]: event.target.value || null }))
                    }
                  >
                    <option value="">Do not import</option>
                    {IMPORT_COLUMNS.map((column) => (
                      <option key={column.key} value={column.key}>
                        {column.label}
                        {column.required ? ' (required)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {unmappedRequired.length > 0 ? (
              <Alert variant="warning" title="Required columns are not mapped">
                {unmappedRequired.map((column) => column.label).join(', ')}
              </Alert>
            ) : null}
            {missingReachability ? (
              <Alert variant="warning" title="No reachability column mapped">
                Map either a work email or a phone number - a contact must be reachable somehow.
              </Alert>
            ) : null}

            <div className="flex items-end gap-3">
              <div className="w-72 space-y-1">
                <Label htmlFor="import-campaign">Enrol imported contacts in</Label>
                <Select
                  id="import-campaign"
                  value={campaignId}
                  onChange={(event) => setCampaignId(event.target.value)}
                >
                  <option value="">Do not enrol yet</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                onClick={() => runPreview()}
                disabled={busy || unmappedRequired.length > 0 || missingReachability}
              >
                {busy ? 'Validating...' : 'Validate rows'}
              </Button>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* --- Step 3: validate ----------------------------------------------- */}
      {step === 'validate' && preview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            {[
              ['Total rows', preview.summary.totalRows, 'muted'],
              ['Valid', preview.summary.validRows, 'success'],
              ['Invalid', preview.summary.invalidRows, 'danger'],
              ['Duplicates', preview.summary.duplicateRows, 'warning'],
              ['Missing email', preview.summary.missingEmail, 'muted'],
              ['Missing phone', preview.summary.missingPhone, 'muted'],
              ['Missing consent', preview.summary.missingConsent, 'warning'],
              ['Unknown country', preview.summary.unrecognisedCountries, 'warning'],
            ].map(([label, value, tone]) => (
              <Card key={label as string}>
                <CardContent className="p-3 pt-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {label as string}
                  </p>
                  <p className="numeric mt-0.5 text-xl font-semibold text-navy-900">{value as number}</p>
                  <Badge variant={tone as never} className="mt-1">
                    {tone === 'success' ? 'will import' : tone === 'danger' ? 'blocked' : 'check'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rows needing attention</CardTitle>
              <CardDescription>
                Correct a cell to fix a row, or skip it. Corrections are re-validated before import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {problemRows.length === 0 ? (
                <Alert variant="success">Every row is valid and ready to import.</Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Problem</TableHead>
                      <TableHead>Correct the value</TableHead>
                      <TableHead>Skip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problemRows.slice(0, 50).map((row) => (
                      <ProblemRow
                        key={row.rowNumber}
                        row={row}
                        headers={headers}
                        mapping={mapping}
                        skipped={skipped.has(row.rowNumber)}
                        onEdit={editCell}
                        onToggleSkip={() =>
                          setSkipped((current) => {
                            const next = new Set(current);
                            if (next.has(row.rowNumber)) next.delete(row.rowNumber);
                            else next.add(row.rowNumber);
                            return next;
                          })
                        }
                      />
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => runPreview()} disabled={busy}>
                  {busy ? 'Re-validating...' : 'Re-validate after corrections'}
                </Button>
                <Button onClick={commit} disabled={busy || preview.summary.validRows === 0}>
                  {busy ? 'Importing...' : `Import ${preview.summary.validRows} valid rows`}
                </Button>
                <Button variant="ghost" onClick={() => setStep('mapping')}>
                  Back to mapping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* --- Step 4: summary ------------------------------------------------- */}
      {step === 'done' && summary ? (
        <Card>
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
            <CardDescription>
              Imported rows were scored immediately. Contacts arrive with ownership unconfirmed, so
              most will appear in the research review queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Rows in file', summary.totalRows],
                ['Imported', summary.importedRows],
                ['Invalid', summary.invalidRows],
                ['Duplicates', summary.duplicateRows],
                ['Skipped', summary.skippedRows],
                ['Accounts created', summary.accountsCreated],
                ['Accounts enriched', summary.accountsUpdated],
                ['Enrolled in campaign', summary.enrolledInCampaign],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded border border-navy-200 p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {label as string}
                  </dt>
                  <dd className="numeric text-xl font-semibold text-navy-900">{value as number}</dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/review">Go to the review queue</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contacts">View contacts</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setStep('upload');
                  setPreview(null);
                  setSummary(null);
                  setRecords([]);
                  setSkipped(new Set());
                }}
              >
                Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ProblemRow({
  row,
  headers,
  mapping,
  skipped,
  onEdit,
  onToggleSkip,
}: {
  row: ProcessedRow;
  headers: string[];
  mapping: Record<string, string | null>;
  skipped: boolean;
  onEdit: (rowNumber: number, header: string, value: string) => void;
  onToggleSkip: () => void;
}) {
  // Offer to correct the first field that failed validation.
  const failingKey = row.errors[0]?.field;
  const header = headers.find((h) => mapping[h] === failingKey);

  return (
    <TableRow className={skipped ? 'opacity-50' : undefined}>
      <TableCell className="numeric text-xs">{row.rowNumber}</TableCell>
      <TableCell>
        <Badge variant={row.status === 'DUPLICATE' ? 'warning' : 'danger'}>{row.status}</Badge>
      </TableCell>
      <TableCell className="text-xs">
        {row.status === 'DUPLICATE'
          ? row.duplicate.detail
          : row.errors.map((issue) => issue.message).join(' ')}
        {row.warnings.length > 0 ? (
          <span className="mt-0.5 block text-[11px] text-amber-700">
            {row.warnings.map((warning) => warning.message).join(' ')}
          </span>
        ) : null}
      </TableCell>
      <TableCell>
        {header ? (
          <Input
            defaultValue={row.raw[header] ?? ''}
            aria-label={`Correct ${header} on row ${row.rowNumber}`}
            className="h-7 text-xs"
            onBlur={(event) => onEdit(row.rowNumber, header, event.target.value)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <input
          type="checkbox"
          aria-label={`Skip row ${row.rowNumber}`}
          checked={skipped}
          onChange={onToggleSkip}
          className="h-3.5 w-3.5"
        />
      </TableCell>
    </TableRow>
  );
}
