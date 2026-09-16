import { Skeleton } from '@/components/ui/Skeleton';

// Shown while IssuesPage's server-side query is in flight — mirrors the
// real IssuesTable's row shape so the layout doesn't shift once data loads.
export default function IssuesLoading() {
  return (
    <div className="flex max-w-5xl flex-col gap-(--space-6)">
      <Skeleton className="h-7 w-24" />

      <div className="flex flex-wrap items-end gap-(--space-4)">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="overflow-hidden rounded-(--radius-lg) border border-(--color-border-subtle)">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-(--space-4) border-b border-(--color-border-subtle) px-(--space-3) py-(--space-3) last:border-b-0"
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 rounded-(--radius-full)" />
            <Skeleton className="h-5 w-28 rounded-(--radius-full)" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
