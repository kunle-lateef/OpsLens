'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

// Thin re-skin of Radix's Tooltip onto OpsLens's own tokens — same
// reasoning as every other primitive in this pass. First use:
// NavSidebar.tsx's disabled "Coming soon" items, which relied on the
// native title attribute (no keyboard/screen-reader support, inconsistent
// browser-default delay) before this.
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-30 rounded-(--radius-sm) border border-(--color-border-strong) bg-(--color-surface-base) px-(--space-2) py-(--space-1) text-(--color-text-primary) opacity-0 [font:var(--font-caption)] shadow-lg transition-opacity duration-150 ease-out data-[state=delayed-open]:opacity-100 motion-reduce:transition-none motion-reduce:data-[state=delayed-open]:opacity-100',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-(--color-border-strong)" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
