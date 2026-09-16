import { describe, expect, it } from 'vitest';
import { estimateImpactFromInvoices } from './estimate-impact';

describe('estimateImpactFromInvoices', () => {
  it('returns null for an empty list rather than a zero figure', () => {
    expect(estimateImpactFromInvoices([])).toBeNull();
  });

  it('sums invoices that share a currency', () => {
    const result = estimateImpactFromInvoices([
      { amount: 100, currency: 'NGN' },
      { amount: 250.5, currency: 'NGN' },
    ]);
    expect(result).toEqual({ amount: 350.5, currency: 'NGN' });
  });

  it('treats a null currency as USD', () => {
    const result = estimateImpactFromInvoices([
      { amount: 100, currency: null },
      { amount: 50, currency: 'USD' },
    ]);
    expect(result).toEqual({ amount: 150, currency: 'USD' });
  });

  it('returns null rather than summing mismatched currencies', () => {
    const result = estimateImpactFromInvoices([
      { amount: 100, currency: 'NGN' },
      { amount: 50, currency: 'USD' },
    ]);
    expect(result).toBeNull();
  });

  it('returns null when the total is zero or negative', () => {
    expect(
      estimateImpactFromInvoices([{ amount: 0, currency: 'NGN' }]),
    ).toBeNull();
  });
});
