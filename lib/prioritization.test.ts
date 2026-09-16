import { describe, expect, it } from 'vitest';
import {
  calculatePriority,
  PRIORITY_ALGORITHM_VERSION,
} from './prioritization';

describe('calculatePriority', () => {
  it('scores a maxed-out Critical/High-confidence case as Critical', () => {
    const result = calculatePriority({
      severity: 'Critical',
      confidence: 'High',
      impactScore: 100,
      affectedCustomerCount: 20,
      ageInHours: 72,
    });

    expect(result).toEqual({
      score: 100,
      label: 'Critical',
      algorithmVersion: PRIORITY_ALGORITHM_VERSION,
    });
  });

  it('scores a brand-new, unconfirmed Low-severity finding as Low', () => {
    const result = calculatePriority({
      severity: 'Low',
      confidence: 'InsufficientEvidence',
      impactScore: null,
      affectedCustomerCount: 0,
      ageInHours: 0,
    });

    expect(result.label).toBe('Low');
    expect(result.score).toBe(0);
  });

  it('lands a High-severity, Medium-confidence, moderately urgent case in the Medium band', () => {
    const result = calculatePriority({
      severity: 'High',
      confidence: 'Medium',
      impactScore: 80,
      affectedCustomerCount: 10,
      ageInHours: 48,
    });

    expect(result.score).toBe(14);
    expect(result.label).toBe('Medium');
  });

  it('lands a Critical-severity but young/low-customer-impact case in the High band, not Critical', () => {
    const result = calculatePriority({
      severity: 'Critical',
      confidence: 'High',
      impactScore: 90,
      affectedCustomerCount: 15,
      ageInHours: 24,
    });

    expect(result.score).toBe(23);
    expect(result.label).toBe('High');
  });

  it('InsufficientEvidence confidence keeps a Critical-severity finding out of the Critical band', () => {
    const result = calculatePriority({
      severity: 'Critical',
      confidence: 'InsufficientEvidence',
      impactScore: 100,
      affectedCustomerCount: 20,
      ageInHours: 72,
    });

    expect(result.label).not.toBe('Critical');
  });
});
