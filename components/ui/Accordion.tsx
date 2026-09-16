'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Plus } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

// Thin re-skin of Radix's Accordion onto OpsLens's own tokens — same
// reasoning as Dialog.tsx/Popover.tsx. First use: the marketing page's FAQ,
// currently always-expanded. type="single" + collapsible since these are
// independent questions, not a sequence where several might reasonably
// stay open together.
//
// AccordionItem has no default border/background of its own — the FAQ
// treats each item as its own standalone card (border + background driven
// entirely by the FAQ's own per-item className, including a data-[state]
// swap to a filled brand-solid card when open); a future non-card
// consumer supplies its own divider instead of inheriting one it doesn't
// want. The toggle is a Plus rotating 45° into an "×" on open, in a small
// circular badge, rather than a bare chevron — a closer, still-token-only
// match to the reference the FAQ redesign was built from.
export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={className} {...props} />;
}

export function AccordionTrigger({
  className,
  iconClassName,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
  iconClassName?: string;
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'flex flex-1 items-center justify-between gap-(--space-3) py-(--space-4) text-left [font:var(--font-h3)]',
          'focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <span
          className={cn(
            'flex h-(--space-6) w-(--space-6) shrink-0 items-center justify-center rounded-(--radius-full) border border-(--color-border-strong) text-(--color-text-tertiary)',
            iconClassName,
          )}
        >
          <Plus
            size={13}
            aria-hidden="true"
            className="transition-transform duration-200 motion-reduce:transition-none [[data-state=open]_&]:rotate-45"
          />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-[accordion-up_200ms_ease-out] data-[state=open]:animate-[accordion-down_200ms_ease-out] motion-reduce:[animation-duration:0.01ms]"
      {...props}
    >
      <div className={cn('pb-(--space-4)', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
