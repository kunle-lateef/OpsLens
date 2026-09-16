import { useId } from 'react';
import { cn } from '@/lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
};

// Label sits above the input, error appears below using --color-critical,
// per design-system.md's Input component rule. Label/error are associated
// via id/aria-describedby, not layout alone — see design-system.md's
// Accessibility section.
//
// `hint` is a neutral, always-visible helper line (e.g. a password
// requirement) — distinct from `error`, which only appears after a
// validation failure. Shown in --color-text-tertiary like the typography
// table's other de-emphasized-metadata uses (timestamps, captions).
// Suppressed while an error is present so the two never stack and repeat
// the same information.
export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-(--space-1-5)">
      <label
        htmlFor={inputId}
        className="text-(--color-text-secondary) [font:var(--font-label)]"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? hintId}
        className={cn(
          'h-(--space-10) rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface-elevated) px-(--space-3) text-(--color-text-primary) [font:var(--font-body)]',
          'focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none',
          error && 'border-(--color-critical)',
          className,
        )}
        {...props}
      />
      {error && (
        <p
          id={errorId}
          className="flex items-center gap-(--space-1) text-(--color-critical) [font:var(--font-caption)]"
        >
          {error}
        </p>
      )}
      {hintId && (
        <p
          id={hintId}
          className="text-(--color-text-tertiary) [font:var(--font-caption)]"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
