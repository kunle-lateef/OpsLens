import { cn } from '@/lib/cn';

type Variant = 'icon' | 'horizontal';
type Tone = 'auto' | 'color';

type BrandMarkProps = {
  /** 'icon' is the square corner-bracket mark alone; 'horizontal' adds the wordmark. */
  variant?: Variant;
  /**
   * 'auto' (default) is the original two-lockup scheme: an all-white mark
   * on dark theme, all-blue-and-dark-text on light theme — what every
   * existing usage (e.g. OrgSwitcher's sidebar mark) still gets, unchanged.
   * 'color' keeps the brand-blue icon on dark theme too, pairing it with a
   * white wordmark built for that — see design-system.md's Logo & Brand
   * Assets section. Opt-in per call site rather than the new default, so
   * adopting it doesn't silently recolor every other usage in the app.
   */
  tone?: Tone;
  /** Rendered height in px — width follows the asset's own aspect ratio. */
  size?: number;
  className?: string;
};

// icon.svg is 100x100 (square); horizontal.svg is 294x72.
const ASPECT_RATIO: Record<Variant, number> = { icon: 1, horizontal: 294 / 72 };

// Dark-theme asset per (tone, variant). The icon itself has no legibility
// concern either way — it's just a shape — so 'color' simply points it at
// the same blue file light theme already uses. The horizontal lockup does
// have a legibility concern (its wordmark), so 'color' uses a dedicated
// blue-icon/white-wordmark asset rather than the all-blue one light theme
// uses, whose near-black wordmark disappears on a dark surface.
const DARK_ASSET: Record<Tone, Record<Variant, string>> = {
  auto: {
    icon: 'opslens-icon-white.svg',
    horizontal: 'opslens-horizontal-white.svg',
  },
  color: {
    icon: 'opslens-icon-blue.svg',
    horizontal: 'opslens-horizontal-color.svg',
  },
};

// Light-theme asset doesn't vary by tone — the existing blue lockup's dark
// wordmark already reads fine against a light surface either way.
const LIGHT_ASSET: Record<Variant, string> = {
  icon: 'opslens-icon-blue.svg',
  horizontal: 'opslens-horizontal-blue.svg',
};

/**
 * The only place a /logo/ path is referenced anywhere in the app — see
 * design-system.md's Logo & Brand Assets section: "never by importing a
 * path from public/logo/ directly in a feature component." Renders both
 * the dark-theme and light-theme variants and lets CSS (app/globals.css's
 * .brand-mark-dark/.brand-mark-light rules) pick the right one for the
 * current theme, since theme here is CSS-only — this component (often used
 * from a server component like OrgSwitcher's parent layout) has no theme
 * value to branch on.
 */
export function BrandMark({
  variant = 'icon',
  tone = 'auto',
  size = 20,
  className,
}: BrandMarkProps) {
  const width = Math.round(size * ASPECT_RATIO[variant]);

  return (
    <>
      <img
        src={`/logo/${DARK_ASSET[tone][variant]}`}
        alt="OpsLens"
        width={width}
        height={size}
        className={cn('brand-mark-dark', className)}
      />
      <img
        src={`/logo/${LIGHT_ASSET[variant]}`}
        alt="OpsLens"
        width={width}
        height={size}
        className={cn('brand-mark-light', className)}
      />
    </>
  );
}
