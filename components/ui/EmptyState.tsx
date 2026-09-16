import type { AppIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon: AppIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

// A shared shape for "nothing here" states — icon, title, one line of
// context, an optional path forward — replacing the single plain-paragraph
// pattern used ad hoc across pages (Issues Feed, and anywhere else that
// currently just puts a <p> inside a Card). Uses --color-brand-accent for
// the icon (the same "quiet accent, not a status color" role it already
// plays for the eyebrow badge and active sidebar icon) — never a
// severity/status token here, since an empty state isn't reporting one.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-(--space-3) rounded-(--radius-lg) border border-(--color-border-subtle) bg-(--color-surface-elevated) px-(--space-6) py-(--space-8) text-center',
        className,
      )}
    >
      <span className="flex h-(--space-10) w-(--space-10) items-center justify-center rounded-(--radius-full) bg-(--color-brand-tint-medium) text-(--color-brand-accent)">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-(--space-1)">
        <p className="[font:var(--font-h3)]">{title}</p>
        <p className="max-w-sm text-(--color-text-secondary) [font:var(--font-body)]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
