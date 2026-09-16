import { describe, expect, it } from 'vitest';
import { suggestMapping } from './suggest-mapping';

describe('suggestMapping', () => {
  it('matches a column name that exactly equals a target field name', () => {
    const result = suggestMapping('name');
    expect(result).toEqual({
      entity: 'Customer',
      field: 'name',
      confidence: 0.95,
    });
  });

  it('matches a listed synonym with high confidence', () => {
    const result = suggestMapping('order_id');
    expect(result).toEqual({
      entity: 'Order',
      field: 'externalId',
      confidence: 0.95,
    });
  });

  it('is case- and punctuation-insensitive', () => {
    const result = suggestMapping('Customer Name');
    expect(result).toEqual({
      entity: 'Customer',
      field: 'name',
      confidence: 0.95,
    });
  });

  it('falls back to a lower-confidence partial match', () => {
    const result = suggestMapping('delivery_date_actual');
    expect(result?.entity).toBe('Delivery');
    expect(result?.field).toBe('deliveredAt');
    expect(result?.confidence).toBeLessThan(0.95);
  });

  it('returns null for a column with no reasonable match', () => {
    expect(suggestMapping('xyzzy_unrelated_column')).toBeNull();
  });

  it('returns null for an empty or whitespace-only column name', () => {
    expect(suggestMapping('   ')).toBeNull();
  });
});
