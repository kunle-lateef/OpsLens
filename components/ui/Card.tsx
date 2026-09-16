import { cn } from '@/lib/cn';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Only true for a card that needs to float above a busy background — see design-system.md's Card rule. */
  elevated?: boolean;
  className?: string;
};

// Rounded corners (small/medium radius), subtle border, no drop shadow by
// default — per design-system.md's Card component rule.
export function Card({ elevated = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-(--radius-lg) border border-(--color-border-subtle) bg-(--color-surface-elevated) p-(--space-4)',
        elevated && 'shadow-lg',
        className,
      )}
      {...props}
    />
  );
}
