import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

// Shown automatically by Next.js while OverviewPage's server-side data
// fetch (getMorningBriefData) is in flight — see architecture.md's
// Rendering Rules note that the real page is server-rendered, never a
// client-side fetch. This file only fills that one network round-trip;
// shapes mirror the real layout (Health Score card, 3 risk stat cards,
// recommendation card) so nothing jumps around once real content arrives.
export default function OverviewLoading() {
  return (
    <div className="flex max-w-5xl flex-col gap-(--space-6)">
      <div className="flex flex-col gap-(--space-2)">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      <Card className="flex flex-col gap-(--space-4)">
        <Skeleton className="h-9 w-40" />
        <div className="grid grid-cols-2 gap-(--space-3) sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-(--space-1)">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-(--space-3) sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-(--space-1)">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-(--space-2)">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    </div>
  );
}
