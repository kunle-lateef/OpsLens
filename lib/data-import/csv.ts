import { parse } from 'csv-parse/sync';

export const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_CSV_ROWS = 50_000;

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export class CsvParseError extends Error {}

/**
 * Parses CSV text into headers + row objects. Row-count capped before
 * attempting to hold the whole file in memory — see security.md's File
 * Uploads section. Malformed content throws CsvParseError with a message
 * safe to show the user directly (no raw parser internals).
 */
export function parseCsvText(content: string): ParsedCsv {
  let records: Record<string, string>[];

  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch {
    throw new CsvParseError(
      'This file could not be read as CSV. Check that it is a plain-text, comma-separated file.',
    );
  }

  if (records.length === 0) {
    throw new CsvParseError('This file has no data rows.');
  }

  if (records.length > MAX_CSV_ROWS) {
    throw new CsvParseError(
      `This file has more than ${MAX_CSV_ROWS.toLocaleString()} rows, which is above the supported limit.`,
    );
  }

  const headers = Object.keys(records[0]);
  if (headers.length === 0 || headers.some((header) => header.trim() === '')) {
    throw new CsvParseError('This file has an empty or malformed header row.');
  }

  return { headers, rows: records };
}
