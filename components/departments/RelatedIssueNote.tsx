import Link from 'next/link';
import type { RelatedIssue } from '@/lib/intelligence/related-issue';

// Renders nothing when there's no real match — see
// lib/intelligence/related-issue.ts's doc comment: never a fabricated
// "likely cause" just to fill the space under a department's KPI cards.
export function RelatedIssueNote({ issue }: { issue: RelatedIssue }) {
  if (!issue) return null;

  return (
    <Link
      href={`/issues/${issue.id}`}
      className="text-(--color-brand-accent) [font:var(--font-caption)] hover:underline"
    >
      Likely related to: {issue.title} →
    </Link>
  );
}
