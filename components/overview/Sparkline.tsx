import { buildSparklineGeometry } from '@/lib/sparkline';

type SparklineProps = {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * A single restrained trend line — area fill, no grid, an emphasized
 * endpoint — never a substitute for the numeric delta text next to it (see
 * design-system.md's "status is never color alone" principle: this is
 * decorative/supplementary, so it's aria-hidden). Renders nothing for
 * fewer than two points rather than a flat or fabricated line.
 */
export function Sparkline({
  points,
  color = 'var(--color-success)',
  width = 120,
  height = 32,
  className,
}: SparklineProps) {
  const padding = 3;
  const geometry = buildSparklineGeometry(points, width, height, padding);
  if (!geometry) return null;

  return (
    <svg
      width={width}
      height={height + 4}
      viewBox={`0 0 ${width} ${height + 4}`}
      className={className}
      aria-hidden="true"
    >
      <path d={geometry.areaPath} fill={color} opacity={0.15} />
      <path
        d={geometry.linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={geometry.endpoint.x}
        cy={geometry.endpoint.y}
        r={3}
        fill={color}
      />
    </svg>
  );
}
