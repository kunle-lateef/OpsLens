// @hugeicons/core-free-icons ships per-icon JS at dist/esm/<Name>.js (what
// icons.tsx imports directly, to avoid pulling in the whole 6,000+ icon
// barrel just to tree-shake a handful) but no matching per-icon .d.ts files
// — only a single dist/types/index.d.ts covering the barrel. This ambient
// declaration is the ecosystem's own recommended fix for that gap, not a
// workaround for a mistake on our end.
declare module '@hugeicons/core-free-icons/*' {
  import type { IconSvgElement } from '@hugeicons/react';
  const icon: IconSvgElement;
  export default icon;
}
