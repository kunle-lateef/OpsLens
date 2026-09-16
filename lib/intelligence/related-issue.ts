import { db } from '@/lib/db';

export type RelatedIssue = { id: string; title: string } | null;

/**
 * The highest-priority open Issue whose Insight evidence text matches any
 * of the given topic keywords — the same narrow, evidence-text-matching
 * approach already used for Issue.impactAmount (see estimate-impact.ts and
 * create-issue-from-insight.ts's isInvoiceRelated check), reused here to
 * connect a department page's KPIs to a real, already-detected Issue
 * instead of inventing a "likely cause" the page can't actually back with
 * evidence. Returns null — rendering nothing — when there's no real match,
 * never a guessed connection.
 */
export async function findRelatedOpenIssue(
  organizationId: string,
  keywords: string[],
): Promise<RelatedIssue> {
  const issue = await db.issue.findFirst({
    where: {
      organizationId,
      status: { notIn: ['Resolved', 'Dismissed'] },
      insight: {
        evidence: {
          some: {
            OR: keywords.flatMap((keyword) => [
              { sourceType: { contains: keyword, mode: 'insensitive' } },
              { description: { contains: keyword, mode: 'insensitive' } },
            ]),
          },
        },
      },
    },
    orderBy: { priorityScore: 'desc' },
    select: { id: true, title: true },
  });
  return issue;
}
