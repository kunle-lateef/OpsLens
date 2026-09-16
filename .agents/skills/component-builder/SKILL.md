# Component Builder Skill

Load this skill for any task that creates or modifies a React component in OpsLens. It is the template and pattern reference so a new component fits the codebase instead of reinventing conventions that already exist — especially the severity/confidence/evidence display patterns that show up across the Morning Brief, Issues Feed, and Issue Detail.

## What This Skill Does

It gives you the standard component shape, the variant-handling pattern, and — specific to OpsLens — the pattern for any component that displays AI-generated content, since that's a recurring need across nearly every screen in the dashboard. Do not build a one-off colored badge or a bespoke evidence indicator; use the shared primitives this skill defines.

## The Component Template

```tsx
import { cn } from '@/lib/cn';

type ComponentNameProps = {
  // required props first
  // optional props after
  className?: string;
};

export function ComponentName({ /* ...props */, className }: ComponentNameProps) {
  return (
    <div className={cn('base-classes-here', className)}>
      {/* ... */}
    </div>
  );
}
```

Named export, not default. `className` is always accepted and merged with `cn()`, never overwritten. Default to a server component; add `"use client"` only if the component actually needs state, effects, browser APIs, or real event handlers — if you're unsure, start without it and let TypeScript tell you if you need it.

## Variant Handling

If a component has variants (sizes, colors, styles), use `class-variance-authority` (`cva`) — a settled dependency decision for this codebase, the same as anything in `architecture.md`'s Tech Stack section, not something to swap for hand-stacked conditional class strings.

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-[--radius-md] [font:var(--font-label)] transition',
  {
    variants: {
      variant: {
        primary: 'bg-[--color-brand-solid] text-white hover:bg-[--color-brand-solid-hover] active:bg-[--color-brand-solid-pressed]',
        secondary: 'bg-[--color-surface-elevated] text-[--color-text-primary] border border-[--color-border-strong]',
        ghost: 'bg-transparent text-[--color-text-primary] hover:bg-[--color-surface-elevated]',
      },
      size: {
        sm: 'h-[--space-8] px-[--space-3]',
        md: 'h-[--space-10] px-[--space-4]',
        lg: 'h-[--space-12] px-[--space-6]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);
```

Every value here is a design-system token, including size — `rounded-[--radius-md]` and `h-[--space-*]`/`px-[--space-*]` reference `tokens/tokens.css` directly rather than Tailwind's own built-in scales, which don't line up with ours (Tailwind's default `rounded-md` is 0.375rem; this project's `--radius-md` is 0.5rem). Button label text uses `[font:var(--font-label)]` — the arbitrary-property syntax, since `--font-label` is a `font` shorthand token, not a bare size — matching `design-system.md`'s Component type mapping table ("button labels" → `--font-label`). Note the primary variant uses `--color-brand-solid`, never `--color-brand-accent` — see `design-system.md`'s Color System for why a filled button and a text/icon accent are different tokens with different contrast requirements.

## Trust-Model-Aware Components

This is the pattern most specific to OpsLens and the one most worth getting right, since it's the visual expression of the whole product's trust model (see `design-system.md`).

**`SeverityBadge`** — the only component that should ever render an `IssueSeverity` or `NotificationSeverity` indicator. It takes a severity value and looks up the correct token from `design-system.md`'s Color semantics table rather than accepting a raw color. Never hardcode a color for severity display anywhere else — always compose this component.

**`ConfidenceTag`** — the same pattern for `ConfidenceLevel` (`High | Medium | Low | InsufficientEvidence`). Visually distinct from `SeverityBadge` (outlined, no icon, vs. filled with icon) so the two never blur together when they appear on the same card — an issue can be Critical severity and Low confidence at once, and a user needs to read those as two different signals at a glance, not one confusing color.

**`EvidencePanel`** — the only component that should render the supporting evidence behind an `Insight`, root-cause explanation, or `Recommendation`. **Rule for any component that composes it: if a component displays an AI-generated conclusion, its evidence is never optional or hidden behind a hover — it must be visible in the default state, or reachable with exactly one click that's visually obvious.** This is a hard requirement, not a style preference — see `design-system.md`'s EvidencePanel section for this exact rule, and `AGENTS.md`'s Non-Negotiables for the underlying data-layer guarantee (every `Insight` has `Evidence`) it's visually expressing.

**`CausalChain`** — the only component that should render a root-cause contributing-factor visualization. Always uses hedged language ("likely," "contributing factor," "correlated") in its labels — never asserts causation. Each node links back to the `Evidence` it's derived from.

**`StatusStepper`** — the only component that should render an `Issue`'s lifecycle status (`Detected → Reviewed → Acknowledged → InProgress → Resolved/Dismissed`).

**Rule for AI-generated text content:** any component rendering free-text AI output (a root-cause explanation, a recommendation, an AI Assistant answer) must use the type-weight rule from `design-system.md` — Low-confidence content is never set in a heavier weight than higher-confidence content in the same view.

## Wiring Accessibility

- Interactive elements get a visible focus state (`focus-visible:ring-2 focus-visible:ring-[--color-focus-ring]`).
- Icon-only buttons get `aria-label`.
- `SeverityBadge`/`ConfidenceTag`/`StatusStepper` all carry an `aria-label` describing the state in words (e.g., `aria-label="Critical severity"`, `aria-label="Low confidence"`), since they communicate meaning primarily through color and would otherwise be invisible to a screen reader.
- Form inputs get associated labels.
- Images and logo marks get `alt` text.

## Common Mistakes

- Hardcoding a hex value or Tailwind arbitrary value instead of a design-system token — there's almost always a token for it (`design-system.md`).
- Building a second badge component instead of extending `SeverityBadge`/`ConfidenceTag`/`StatusStepper` with a new variant.
- Using `--color-brand-accent` as a filled button background instead of `--color-brand-solid`.
- Marking a component `"use client"` when it has no state, effects, or handlers.
- Rendering AI-generated content without its evidence, "to keep the layout clean" — this is exactly the shortcut the trust model exists to prevent.
- Reaching for an arbitrary Tailwind value instead of checking `design-system.md` for the token that already covers it.

## Resources in This Skill

- None yet. If a canonical `SeverityBadge`/`ConfidenceTag`/`EvidencePanel` reference implementation is added later, it belongs in `resources/` in this folder — copy and adapt, don't rebuild from memory.
