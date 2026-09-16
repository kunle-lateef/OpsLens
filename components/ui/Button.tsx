import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-(--radius-md) [font:var(--font-label)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-(--color-brand-solid) text-white hover:bg-(--color-brand-solid-hover) active:bg-(--color-brand-solid-pressed)',
        secondary:
          'bg-(--color-surface-elevated) text-(--color-text-primary) border border-(--color-border-strong)',
        ghost:
          'bg-transparent text-(--color-text-primary) hover:bg-(--color-surface-elevated)',
      },
      size: {
        sm: 'h-(--space-8) px-(--space-3)',
        md: 'h-(--space-10) px-(--space-4)',
        lg: 'h-(--space-12) px-(--space-6)',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  };

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
