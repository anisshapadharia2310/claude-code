/**
 * Minimal RFC 4180 CSV reader and writer.
 *
 * Written by hand rather than pulled in as a dependency because the import
 * pipeline needs to report the exact source line of every bad row, which most
 * stream parsers make awkward.
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  /** 1-based source line number for each row, for error messages. */
  lineNumbers: number[];
}

export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = [];
  const lineNumbers: number[] = [];

  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let line = 1;
  let recordStartLine = 1;
  let sawAnyChar = false;

  const input = text.replace(/^﻿/, '');

  const endField = (): void => { record.push(field); field = ''; };
  const endRecord = (): void => {
    endField();
    const isBlank = record.length === 1 && record[0]!.trim() === '';
    if (!isBlank) {
      records.push(record);
      lineNumbers.push(recordStartLine);
    }
    record = [];
    recordStartLine = line;
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!;
    sawAnyChar = true;

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else {
        if (char === '\n') line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"' && field === '') { inQuotes = true; continue; }
    if (char === ',') { endField(); continue; }
    if (char === '\r') continue;
    if (char === '\n') { line += 1; endRecord(); recordStartLine = line; continue; }
    field += char;
  }

  if (sawAnyChar && (field !== '' || record.length > 0)) endRecord();

  const headers = (records.shift() ?? []).map((header) => header.trim());
  lineNumbers.shift();

  return { headers, rows: records, lineNumbers };
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) lines.push(row.map(escapeCell).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

/** Loose header matching: "Company Name", "company_name" and "companyname" all match. */
export function headerKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}
