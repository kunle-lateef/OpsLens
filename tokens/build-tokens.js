/**
 * Converts the design token JSON files (color, typography, spacing/border-radius)
 * into a single CSS custom-properties file.
 *
 * Usage: node build-tokens.js
 *
 * Handles two token shapes found in the source files:
 *  1. Figma "Design Tokens" format — objects with "type" and "value" keys
 *     (used by color-tokens.tokens.json and the "font" branch of
 *     typography-tokens.tokens.json). The "typography" branch of that file
 *     is skipped since it duplicates the same data as decomposed tokens.
 *  2. Plain flat dictionaries — objects whose values are already final
 *     CSS-ready strings (used by spacing-border-radius.json). Keys in that
 *     shape already self-describe (e.g. "spacing-4", "radius-lg"), so they
 *     are emitted as-is rather than prefixed with their parent group name.
 *
 * Every token becomes its own CSS variable named after its full path in the
 * source tree (kebab-cased) — no merging across color modes or breakpoints,
 * so light/dark and desktop/tablet/mobile each get distinct variables.
 */

const fs = require('fs');
const path = require('path');

const COLOR_FILE = path.join(__dirname, 'color-tokens.tokens.json');
const TYPOGRAPHY_FILE = path.join(__dirname, 'typography-tokens.tokens.json');
const SPACING_FILE = path.join(__dirname, 'spacing-border-radius.json');
const OUTPUT_FILE = path.join(__dirname, 'tokens.css');

const FIGMA_METADATA_KEYS = new Set(['extensions', 'description', 'blendMode']);

// Property names that lose their redundant "font" prefix once nested under
// the "--font-..." root (e.g. fontSize -> size, not font-...-font-size).
const FONT_PROP_RENAMES = {
  fontSize: 'size',
  fontWeight: 'weight',
  fontFamily: 'family',
  fontStyle: 'style',
  fontStretch: 'stretch',
};

// Numeric properties that must stay unitless (no "px" appended).
const UNITLESS_NUMERIC_PROPS = new Set(['fontWeight', 'opacity', 'zIndex']);

function kebabCase(segment) {
  return String(segment)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // camelCase -> camel-Case
    .replace(/[\s_.]+/g, '-') // spaces / underscores / dots -> hyphen
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeColorMode(segment) {
  const lower = String(segment).toLowerCase();
  if (lower === 'dark mode') return 'dark';
  if (lower === 'light mode') return 'light';
  return segment;
}

function formatValue(propKey, value) {
  if (typeof value === 'number') {
    return UNITLESS_NUMERIC_PROPS.has(propKey) ? String(value) : `${value}px`;
  }
  if (propKey === 'fontFamily') return `"${value}"`;
  return String(value);
}

function isFigmaToken(node) {
  return (
    node &&
    typeof node === 'object' &&
    !Array.isArray(node) &&
    'type' in node &&
    'value' in node
  );
}

function isFlatDictionary(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const values = Object.values(node);
  return (
    values.length > 0 &&
    values.every((v) => typeof v !== 'object' || v === null)
  );
}

function buildVarName(pathSegments) {
  return `--${pathSegments.map((s) => kebabCase(normalizeColorMode(s))).join('-')}`;
}

function walk(node, pathSegments, emit) {
  for (const [key, value] of Object.entries(node)) {
    if (FIGMA_METADATA_KEYS.has(key)) continue;
    const nextPath = [...pathSegments, key];

    if (isFigmaToken(value)) {
      const tokenValue = value.value;
      if (
        tokenValue !== null &&
        typeof tokenValue === 'object' &&
        !Array.isArray(tokenValue)
      ) {
        // Composite token (e.g. custom-fontStyle) — one variable per sub-property.
        const isFontToken = pathSegments[0] === 'font';
        for (const [subKey, subValue] of Object.entries(tokenValue)) {
          const suffix =
            isFontToken && FONT_PROP_RENAMES[subKey]
              ? FONT_PROP_RENAMES[subKey]
              : subKey;
          emit(
            buildVarName([...nextPath, suffix]),
            formatValue(subKey, subValue),
          );
        }
      } else {
        emit(buildVarName(nextPath), formatValue(key, tokenValue));
      }
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      if (isFlatDictionary(value)) {
        // Keys already self-describe (e.g. "spacing-4", "radius-lg") — use them directly.
        for (const [flatKey, flatValue] of Object.entries(value)) {
          emit(`--${kebabCase(flatKey)}`, String(flatValue));
        }
      } else {
        walk(value, nextPath, emit);
      }
      continue;
    }

    // Bare primitive at this level (shouldn't normally happen outside a flat dictionary).
    emit(buildVarName(nextPath), formatValue(key, value));
  }
}

function collectVariables(rootNode, rootKey) {
  const variables = [];
  walk({ [rootKey]: rootNode }, [], (name, value) =>
    variables.push({ name, value }),
  );
  return variables;
}

function renderSection(title, variables) {
  const lines = [`  /* ${title} */`];
  for (const { name, value } of variables) {
    lines.push(`  ${name}: ${value};`);
  }
  return lines.join('\n');
}

// Semantic color aliases required by .agents/rules/design-system.md — each maps
// a semantic name to the literal role token(s) it should track. Omit `light`
// when the value is identical in both modes (no override needed).
const SEMANTIC_COLORS = [
  {
    name: '--color-brand-accent',
    dark: '--color-dark-status-accent',
    light: '--color-light-status-accent',
  },
  { name: '--color-brand-solid', dark: '--color-dark-brand-solid-default' },
  { name: '--color-brand-solid-hover', dark: '--color-dark-brand-solid-hover' },
  {
    name: '--color-brand-solid-pressed',
    dark: '--color-dark-brand-solid-pressed',
  },
  { name: '--color-brand-tint-subtle', dark: '--color-dark-brand-tint-subtle' },
  { name: '--color-brand-tint-medium', dark: '--color-dark-brand-tint-medium' },
  {
    name: '--color-brand-tint-selected',
    dark: '--color-dark-selected',
    light: '--color-light-selected',
  },
  {
    name: '--color-critical',
    dark: '--color-dark-status-critical',
    light: '--color-light-status-critical',
  },
  {
    name: '--color-high',
    dark: '--color-dark-status-high',
    light: '--color-light-status-high',
  },
  {
    name: '--color-medium',
    dark: '--color-dark-status-medium',
    light: '--color-light-status-medium',
  },
  {
    name: '--color-success',
    dark: '--color-dark-status-success-improving',
    light: '--color-light-status-success-improving',
  },
  {
    name: '--color-neutral',
    dark: '--color-dark-status-neutral-informational',
    light: '--color-light-status-neutral-informational',
  },
  {
    name: '--color-cat-delivery',
    dark: '--color-dark-categorical-delivery',
    light: '--color-light-categorical-delivery',
  },
  {
    name: '--color-cat-inventory',
    dark: '--color-dark-categorical-inventory',
    light: '--color-light-categorical-inventory',
  },
  {
    name: '--color-cat-customer',
    dark: '--color-dark-categorical-customer',
    light: '--color-light-categorical-customer',
  },
  {
    name: '--color-cat-financial',
    dark: '--color-dark-categorical-financial',
    light: '--color-light-categorical-financial',
  },
  {
    name: '--color-cat-incident',
    dark: '--color-dark-categorical-incident',
    light: '--color-light-categorical-incident',
  },
  {
    name: '--color-confidence-high',
    dark: '--color-dark-confidence-high-confidence',
    light: '--color-light-confidence-high-confidence',
  },
  {
    name: '--color-confidence-medium',
    dark: '--color-dark-confidence-medium-confidence',
    light: '--color-light-confidence-medium-confidence',
  },
  {
    name: '--color-confidence-low',
    dark: '--color-dark-confidence-low-confidence',
    light: '--color-light-confidence-low-confidence',
  },
  {
    name: '--color-confidence-insufficient',
    dark: '--color-dark-confidence-insufficient-evidence',
    light: '--color-light-confidence-insufficient-evidence',
  },
  {
    name: '--color-surface-base',
    dark: '--color-dark-surface-base',
    light: '--color-light-surface-base',
  },
  {
    name: '--color-surface-elevated',
    dark: '--color-dark-surface-elevated',
    light: '--color-light-surface-elevated',
  },
  {
    name: '--color-text-primary',
    dark: '--color-dark-text-primary',
    light: '--color-light-text-primary',
  },
  {
    name: '--color-text-secondary',
    dark: '--color-dark-text-secondary',
    light: '--color-light-text-secondary',
  },
  {
    name: '--color-text-tertiary',
    dark: '--color-dark-text-tertiary-metadata',
    light: '--color-light-text-tertiary-metadata',
  },
  {
    name: '--color-border-subtle',
    dark: '--color-dark-border-subtle',
    light: '--color-light-border-subtle',
  },
  {
    name: '--color-border-strong',
    dark: '--color-dark-border-strong-interactive',
    light: '--color-light-border-strong-interactive',
  },
  {
    name: '--color-focus-ring',
    dark: '--color-dark-focus-ring',
    light: '--color-light-focus-ring',
  },
  {
    name: '--color-overlay',
    dark: '--color-dark-overlay-scrim',
    light: '--color-light-overlay-scrim',
  },
  {
    name: '--color-disabled',
    dark: '--color-dark-disabled',
    light: '--color-light-disabled',
  },
];

function renderSemanticColors(defined) {
  const missing = (ref) => !defined.has(ref);
  const base = [
    '  /* Semantic color aliases (see .agents/rules/design-system.md) */',
  ];
  const lightOverrides = [];
  for (const { name, dark, light } of SEMANTIC_COLORS) {
    if (missing(dark))
      throw new Error(
        `Semantic alias ${name} references unknown token ${dark}`,
      );
    base.push(`  ${name}: var(${dark});`);
    if (light) {
      if (missing(light))
        throw new Error(
          `Semantic alias ${name} references unknown token ${light}`,
        );
      lightOverrides.push(`  ${name}: var(${light});`);
    }
  }
  return { base: base.join('\n'), lightOverrides: lightOverrides.join('\n') };
}

// --space-* is the name design-system.md documents; the raw spacing scale
// (from the flat-dictionary branch above) is generated as --spacing-*.
function renderSemanticSpacing(spacingVars) {
  const lines = [
    '  /* Semantic spacing aliases (see .agents/rules/design-system.md) */',
  ];
  for (const { name } of spacingVars) {
    const semanticName = name.replace(/^--spacing-/, '--space-');
    lines.push(`  ${semanticName}: var(${name});`);
  }
  return lines.join('\n');
}

// design-system.md's Typography table (--font-display through --font-caption)
// is treated as its own authoritative, fixed scale — hardcoded here rather than
// aliased to a raw --font-desktop-*/-tablet-*/-mobile-* token, because none of
// its 8 rows map cleanly onto a single breakpoint's named style in the Figma
// export (e.g. its documented --font-h1 spec exactly matches this file's
// "heading 2" bold values, not "heading 1"; --font-h3 matches "body" semibold;
// --font-body matches "body small" regular; and --font-caption's documented
// 11px size has no matching token at any breakpoint at all). Aliasing it to
// the nearest coincidentally-matching token would silently misname that token.
// Each entry becomes a single `font` shorthand variable, matching how
// design-system.md's table names the token (a bare `--font-h1`, not split
// into `-size`/`-line-height`/`-weight`) — usable as `font: var(--font-h1);`.
const FONT_FAMILY_BASE =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const SEMANTIC_TYPE_SCALE = [
  // Marketing-hero-only — the raw Figma export defines this exact
  // size/line-height as "Display XL" (desktop-display-xl-bold) but it was
  // never promoted to a semantic name until now. Nothing in the dashboard
  // uses this; every dashboard heading keeps --font-h1/-h2/-h3 unchanged.
  { name: '--font-display-lg', size: 60, lineHeight: 72, weight: 700 },
  { name: '--font-display', size: 40, lineHeight: 48, weight: 700 },
  { name: '--font-h1', size: 28, lineHeight: 36, weight: 700 },
  { name: '--font-h2', size: 20, lineHeight: 28, weight: 600 },
  { name: '--font-h3', size: 16, lineHeight: 24, weight: 600 },
  { name: '--font-body', size: 14, lineHeight: 20, weight: 400 },
  { name: '--font-body-emphasis', size: 14, lineHeight: 20, weight: 600 },
  { name: '--font-label', size: 12, lineHeight: 16, weight: 500 },
  { name: '--font-caption', size: 11, lineHeight: 14, weight: 400 },
];

function renderSemanticTypography() {
  const lines = [
    '  /* Semantic typography scale (see .agents/rules/design-system.md) — */',
    '  /* fixed values independent of the raw per-breakpoint tokens above,   */',
    "  /* see build-tokens.js's comment on SEMANTIC_TYPE_SCALE for why.      */",
    `  --font-family-base: ${FONT_FAMILY_BASE};`,
  ];
  for (const { name, size, lineHeight, weight } of SEMANTIC_TYPE_SCALE) {
    lines.push(
      `  ${name}: ${weight} ${size}px/${lineHeight}px var(--font-family-base);`,
    );
  }
  return lines.join('\n');
}

// Gradients have no category anywhere in the Figma export — same situation
// as SEMANTIC_TYPE_SCALE above, so handled the same way: a hand-specified,
// documented value here rather than an inline one invented in a component.
// design-system.md's Button section is explicit that "no gradient token is
// defined yet" and one must be added and confirmed before use — this is
// that confirmation, approved for exactly one use (the closing CTA section
// on the marketing page). Built only from already-defined --color-brand-*
// tokens, never a new hue, so it doesn't expand the palette design-system.md
// keeps deliberately closed. --color-brand-accent/-solid/-solid-pressed are
// identical in both themes (see design-system.md's Color System section),
// so one definition covers both — no [data-theme="light"] override needed.
const SEMANTIC_GRADIENTS = [
  {
    name: '--gradient-cta',
    value:
      'radial-gradient(120% 140% at 15% 15%, var(--color-brand-accent) 0%, var(--color-brand-solid) 45%, var(--color-brand-solid-pressed) 100%)',
  },
];

function renderSemanticGradients() {
  const lines = [
    "  /* Semantic gradients (see .agents/rules/design-system.md's Button section) — */",
    '  /* built only from --color-brand-* tokens already defined above, never a new hue. */',
  ];
  for (const { name, value } of SEMANTIC_GRADIENTS) {
    lines.push(`  ${name}: ${value};`);
  }
  return lines.join('\n');
}

function main() {
  const colorTokens = JSON.parse(fs.readFileSync(COLOR_FILE, 'utf8'));
  const typographyTokens = JSON.parse(fs.readFileSync(TYPOGRAPHY_FILE, 'utf8'));
  const spacingTokens = JSON.parse(fs.readFileSync(SPACING_FILE, 'utf8'));

  const colorVars = collectVariables(colorTokens.color, 'color');
  const fontVars = collectVariables(typographyTokens.font, 'font');
  const spacingVars = collectVariables(spacingTokens.spacing, 'spacing');
  const radiusVars = collectVariables(
    spacingTokens.borderRadius,
    'borderRadius',
  );

  const definedColorNames = new Set(colorVars.map((v) => v.name));
  const { base: semanticColorsBase, lightOverrides: semanticColorsLight } =
    renderSemanticColors(definedColorNames);
  const semanticSpacing = renderSemanticSpacing(spacingVars);
  const semanticTypography = renderSemanticTypography();
  const semanticGradients = renderSemanticGradients();

  const sections = [
    renderSection('Color roles (raw, per-mode)', colorVars),
    renderSection('Typography (raw, per-breakpoint)', fontVars),
    renderSection('Spacing (raw)', spacingVars),
    renderSection('Border radius', radiusVars),
  ];

  const css = `/**
 * Auto-generated by build-tokens.js — do not edit by hand.
 * Regenerate with: node build-tokens.js
 */

:root {
${sections.join('\n\n')}

${semanticColorsBase}

${semanticSpacing}

${semanticTypography}

${semanticGradients}
}

[data-theme="light"] {
${semanticColorsLight}
}
`;

  fs.writeFileSync(OUTPUT_FILE, css, 'utf8');

  const semanticTypographyCount = SEMANTIC_TYPE_SCALE.length + 1; // +1 for --font-family-base
  const total =
    colorVars.length +
    fontVars.length +
    spacingVars.length +
    radiusVars.length +
    SEMANTIC_COLORS.length +
    spacingVars.length +
    semanticTypographyCount +
    SEMANTIC_GRADIENTS.length;
  console.log(
    `Wrote ${total} CSS variables to ${path.relative(__dirname, OUTPUT_FILE)}`,
  );
  console.log(
    `  raw — color: ${colorVars.length}, typography: ${fontVars.length}, spacing: ${spacingVars.length}, radius: ${radiusVars.length}`,
  );
  console.log(
    `  semantic — color: ${SEMANTIC_COLORS.length}, spacing: ${spacingVars.length}, typography: ${semanticTypographyCount}, gradients: ${SEMANTIC_GRADIENTS.length}`,
  );
}

main();
