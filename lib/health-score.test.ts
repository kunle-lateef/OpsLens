import { describe, expect, it } from 'vitest';
import {
  calculateHealthScore,
  HEALTH_SCORE_ALGORITHM_VERSION,
} from './health-score';

const HEALTHY_INPUTS = {
  delivery: { totalDeliveries: 100, delayedDeliveries: 0 },
  inventory: { totalInventoryItems: 10, lowStockEvents: 0 },
  customer: { totalOrders: 100, complaints: 0 },
  financial: { totalInvoicedAmount: 10_000, overdueAmount: 0 },
  incident: { totalEvents: 5, highSeverityEvents: 0 },
};

describe('calculateHealthScore', () => {
  it('returns 100 overall and per component when nothing is wrong', () => {
    const result = calculateHealthScore(HEALTHY_INPUTS);

    expect(result.overall).toBe(100);
    expect(result.algorithmVersion).toBe(HEALTH_SCORE_ALGORITHM_VERSION);
    for (const component of Object.values(result.components)) {
      expect(component.score).toBe(100);
    }
  });

  it('lowers the delivery component in proportion to the delay rate', () => {
    const result = calculateHealthScore({
      ...HEALTHY_INPUTS,
      delivery: { totalDeliveries: 100, delayedDeliveries: 31 },
    });

    expect(result.components.delivery).toEqual({ score: 69 });
  });

  it('marks a component as insufficient data when there is no underlying activity, rather than defaulting it', () => {
    const result = calculateHealthScore({
      ...HEALTHY_INPUTS,
      financial: { totalInvoicedAmount: 0, overdueAmount: 0 },
    });

    expect(result.components.financial).toEqual({
      score: null,
      reason: 'insufficient_data',
    });
    // The overall score still computes from the four available components —
    // one missing component doesn't null out the whole score.
    expect(result.overall).toBe(100);
  });

  it('returns a null overall score when every component lacks data', () => {
    const result = calculateHealthScore({
      delivery: { totalDeliveries: 0, delayedDeliveries: 0 },
      inventory: { totalInventoryItems: 0, lowStockEvents: 0 },
      customer: { totalOrders: 0, complaints: 0 },
      financial: { totalInvoicedAmount: 0, overdueAmount: 0 },
      incident: { totalEvents: 0, highSeverityEvents: 0 },
    });

    expect(result.overall).toBeNull();
  });

  it('never lets a component score go negative or above 100', () => {
    const result = calculateHealthScore({
      ...HEALTHY_INPUTS,
      inventory: { totalInventoryItems: 5, lowStockEvents: 50 },
    });

    expect(result.components.inventory).toEqual({ score: 0 });
  });
});
