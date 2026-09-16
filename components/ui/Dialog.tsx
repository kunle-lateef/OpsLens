'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/cn';

// Thin re-skin of Radix's Dialog primitive onto OpsLens's own tokens — no
// new color/spacing scale, see design-system.md's Motion section for why
// the open/close transition is a short opacity/scale fade rather than
// anything decorative, and respects prefers-reduced-motion via Tailwind's
// motion-reduce variant.
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-40 bg-(--color-overlay) opacity-0 transition-opacity duration-150 ease-out data-[state=open]:opacity-100 motion-reduce:transition-none"
      />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 scale-95 rounded-(--radius-lg) border border-(--color-border-strong) bg-(--color-surface-elevated) p-(--space-5) opacity-0 shadow-lg transition-[opacity,transform] duration-150 ease-out data-[state=open]:scale-100 data-[state=open]:opacity-100 motion-reduce:transition-none motion-reduce:data-[state=open]:scale-100',
          'focus-visible:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('mb-(--space-2) [font:var(--font-h3)]', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn(
        'mb-(--space-4) text-(--color-text-secondary) [font:var(--font-body)]',
        className,
      )}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex justify-end gap-(--space-2)', className)}
      {...props}
    />
  );
}

export const DialogClose = DialogPrimitive.Close;
