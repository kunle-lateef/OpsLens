import { cn } from '@/lib/cn';

type IssueStatus =
  | 'Detected'
  | 'Reviewed'
  | 'Acknowledged'
  | 'InProgress'
  | 'Resolved'
  | 'Dismissed';

// Proposed mapping, not yet confirmed with the developer — see
// design-system.md's IssueStatus table.
const STATUS_TOKEN: Record<IssueStatus, string> = {
  Detected: '--color-neutral',
  Reviewed: '--color-neutral',
  Acknowledged: '--color-brand-accent',
  InProgress: '--color-brand-accent',
  Resolved: '--color-success',
  Dismissed: '--color-neutral',
};

const STEPS: IssueStatus[] = [
  'Detected',
  'Reviewed',
  'Acknowledged',
  'InProgress',
  'Resolved',
];

type StatusStepperProps = {
  status: IssueStatus;
  className?: string;
};

/**
 * The only component that should render an Issue's lifecycle status — see
 * design-system.md's StatusStepper section:
 * Detected -> Reviewed -> Acknowledged -> InProgress -> Resolved/Dismissed.
 * Dismissed is a separate terminal branch, not a step on the line — shown
 * with strikethrough per the documented mapping.
 */
export function StatusStepper({ status, className }: StatusStepperProps) {
  if (status === 'Dismissed') {
    return (
      <span
        className={cn(
          'text-(--color-neutral) line-through [font:var(--font-label)]',
          className,
        )}
        aria-label="Dismissed"
      >
        Dismissed
      </span>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <ol
      className={cn(
        // flex-wrap — on narrow viewports this row was clipping instead of
        // scrolling, silently hiding "Resolved" entirely. Five short labels
        // read fine wrapped onto a second line; a scroll container would
        // just hide the same information behind a gesture instead.
        'flex flex-wrap items-center gap-(--space-2)',
        className,
      )}
      aria-label="Issue status"
    >
      {STEPS.map((step, index) => {
        const isComplete = index <= currentIndex;
        return (
          <li key={step} className="flex items-center gap-(--space-2)">
            <span
              aria-current={step === status ? 'step' : undefined}
              className="flex items-center gap-(--space-1) [font:var(--font-label)]"
              style={{
                color: isComplete
                  ? `var(${STATUS_TOKEN[step]})`
                  : 'var(--color-text-tertiary)',
              }}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-(--radius-full)"
                style={{
                  backgroundColor: isComplete
                    ? `var(${STATUS_TOKEN[step]})`
                    : 'var(--color-border-strong)',
                }}
              />
              {step}
            </span>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="h-px w-(--space-4) bg-(--color-border-subtle)"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
