'use client';

import { Toaster as SonnerToaster } from 'sonner';

// Sonner exposes its palette as CSS custom properties on the toaster root
// (--normal-bg, --success-border, etc.) rather than a theme object, so this
// maps each one directly to OpsLens's own tokens instead of adopting
// Sonner's default palette — same "re-skin, don't introduce a competing
// scale" rule as every other component in this pass. First real use:
// RecommendationCard's accept/modify/reject/dismiss actions and
// AssistantChat's feedback buttons, both currently silent on success.
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex items-center gap-(--space-2) rounded-(--radius-md) border p-(--space-3) shadow-lg w-full [font:var(--font-body)]',
          default:
            'bg-(--color-surface-elevated) border-(--color-border-strong) text-(--color-text-primary)',
          success:
            'bg-(--color-surface-elevated) border-l-3 border-l-(--color-success) border-(--color-border-subtle) text-(--color-text-primary)',
          error:
            'bg-(--color-surface-elevated) border-l-3 border-l-(--color-critical) border-(--color-border-subtle) text-(--color-text-primary)',
          title: '[font:var(--font-label)]',
          description:
            'text-(--color-text-secondary) [font:var(--font-caption)]',
        },
      }}
    />
  );
}
