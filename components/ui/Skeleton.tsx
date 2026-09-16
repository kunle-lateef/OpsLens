import { cn } from '@/lib/cn';

// A pulsing placeholder block for content that hasn't loaded yet — never a
// substitute for architecture.md's Rendering Rules (data is still fetched
// server-side; this only fills the gap React Suspense shows during that
// fetch, via each route's loading.tsx). Uses Tailwind's built-in
// animate-pulse rather than a hand-written keyframe, and turns it off for
// prefers-reduced-motion per design-system.md's Motion section.
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-(--radius-sm) bg-(--color-border-subtle) motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
