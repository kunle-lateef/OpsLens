import { describe, expect, it } from 'vitest';
import { parseCsvText, CsvParseError } from './csv';

describe('parseCsvText', () => {
  it('parses headers and rows from well-formed CSV', () => {
    const csv =
      'name,email\nAda Lovelace,ada@example.com\nAlan Turing,alan@example.com';
    const result = parseCsvText(csv);

    expect(result.headers).toEqual(['name', 'email']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
  });

  it('trims whitespace and skips empty lines', () => {
    const csv = 'name, email \n Ada , ada@example.com \n\n';
    const result = parseCsvText(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ name: 'Ada', email: 'ada@example.com' });
  });

  it('throws CsvParseError for a file with no data rows', () => {
    expect(() => parseCsvText('name,email')).toThrow(CsvParseError);
  });

  it('throws CsvParseError for malformed CSV content', () => {
    expect(() =>
      parseCsvText('"unterminated quote,value\nrow2,value2'),
    ).toThrow(CsvParseError);
  });
});
