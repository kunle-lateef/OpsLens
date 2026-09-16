// Pure geometry for the Sparkline primitive — see design-system.md's
// Design System Improvements note on giving trend lines "the same care as
// type: an area fill, a faint grid, an emphasized endpoint." Split out from
// components/overview/Sparkline.tsx so the math is unit-testable without
// rendering anything.
export type SparklineGeometry = {
  linePath: string;
  areaPath: string;
  endpoint: { x: number; y: number };
};

export function buildSparklineGeometry(
  points: number[],
  width: number,
  height: number,
  padding: number,
): SparklineGeometry | null {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = (width - padding * 2) / (points.length - 1);

  const coords = points.map((value, index) => {
    const x = padding + index * step;
    const y =
      height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = `${linePath} L${last.x.toFixed(1)},${height} L${first.x.toFixed(1)},${height} Z`;

  return { linePath, areaPath, endpoint: last };
}
