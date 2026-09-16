'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/cn';

// Thin re-skin of Radix's Popover primitive onto OpsLens's own tokens — same
// reasoning as components/ui/Dialog.tsx. First use: NotificationBell.tsx,
// replacing a hand-rolled useState + click-outside listener that had no
// focus trap and no Escape-to-close.
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  className,
  align = 'end',
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-20 rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface-elevated) shadow-lg',
          'origin-[--radix-popover-content-transform-origin] scale-95 opacity-0 transition-[opacity,transform] duration-150 ease-out data-[state=open]:scale-100 data-[state=open]:opacity-100 motion-reduce:transition-none motion-reduce:data-[state=open]:scale-100',
          'focus-visible:outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
