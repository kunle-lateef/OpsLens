import { describe, expect, it } from 'vitest';
import { buildSparklineGeometry } from './sparkline';

describe('buildSparklineGeometry', () => {
  it('returns null for fewer than two points — a sparkline needs a trend to show', () => {
    expect(buildSparklineGeometry([], 100, 30, 4)).toBeNull();
    expect(buildSparklineGeometry([50], 100, 30, 4)).toBeNull();
  });

  it('places the first and last points at the padding boundaries', () => {
    const geometry = buildSparklineGeometry([10, 20, 30], 100, 30, 4);
    expect(geometry).not.toBeNull();
    expect(geometry!.linePath.startsWith('M4.0,')).toBe(true);
    expect(geometry!.endpoint.x).toBeCloseTo(96, 1);
  });

  it('puts the highest value nearest the top (smallest y) of the drawing area', () => {
    const geometry = buildSparklineGeometry([10, 90], 100, 30, 4);
    // First point (10) is the lowest value -> largest y; last point (90) is
    // the highest value -> smallest y, i.e. near the top of the SVG.
    expect(geometry!.endpoint.y).toBeLessThan(30 - 4);
  });

  it('does not divide by zero when every point is identical', () => {
    const geometry = buildSparklineGeometry([50, 50, 50], 100, 30, 4);
    expect(geometry).not.toBeNull();
    expect(Number.isFinite(geometry!.endpoint.y)).toBe(true);
  });

  it('closes the area path back down to the baseline for a fill', () => {
    const geometry = buildSparklineGeometry([10, 20], 100, 30, 4);
    expect(geometry!.areaPath.endsWith('Z')).toBe(true);
    expect(geometry!.areaPath).toContain(',30');
  });
});
