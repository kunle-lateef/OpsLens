import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  type AppIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

const SEVERITY_CONFIG: Record<
  Severity,
  { token: string; icon: AppIcon; label: string }
> = {
  Critical: {
    token: '--color-critical',
    icon: AlertOctagon,
    label: 'Critical severity',
  },
  High: { token: '--color-high', icon: AlertTriangle, label: 'High severity' },
  Medium: {
    token: '--color-medium',
    icon: AlertCircle,
    label: 'Medium severity',
  },
  Low: { token: '--color-neutral', icon: Info, label: 'Low severity' },
  Informational: {
    token: '--color-neutral',
    icon: Info,
    label: 'Informational',
  },
};

type SeverityBadgeProps = {
  /** IssueSeverity ('Critical'|'High'|'Medium'|'Low') or NotificationSeverity (same, with 'Informational' instead of 'Low') — see code-style.md for why these stay distinct enums. */
  severity: Severity;
  className?: string;
};

/**
 * The only component that should ever render an IssueSeverity or
 * NotificationSeverity indicator — see design-system.md's Color semantics
 * table and component-builder/SKILL.md's Trust-Model-Aware Components.
 * Filled badge, always with an icon and a text label — never color alone.
 *
 * Accessibility note (measured during the Phase 7 audit): white text on
 * these fill colors fails WCAG AA (4.5:1) badly in dark mode for every
 * severity — as low as 1.76:1 for Medium. Black text is the better choice
 * in every case except a ~0.19 shortfall for High in light mode (4.49 vs.
 * the 4.5 threshold, i.e. effectively a wash), so black is used uniformly
 * here rather than a per-severity/per-theme lookup this component has no
 * way to evaluate (theme is CSS-only; there's no theme value available in
 * this server component to branch on).
 *
 * Critical's fill value (`--color-critical`) was changed in a later pass of
 * the same audit specifically because black-on-fill still missed AA with
 * the original hue (4.80 dark / 4.66 light) — see design-system.md's
 * Accessibility section. The new value clears ~5.9:1 with black text in
 * both themes, closing that gap without any change needed here. The icon +
 * text label still means severity is never conveyed by color alone.
 */
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={config.label}
      className={cn(
        'inline-flex items-center gap-(--space-1) rounded-(--radius-full) px-(--space-2) py-(--space-0-5) text-black [font:var(--font-label)]',
        className,
      )}
      style={{ backgroundColor: `var(${config.token})` }}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {severity}
    </span>
  );
}
