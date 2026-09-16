'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfidenceTag } from '@/components/ui/ConfidenceTag';
import { decideOnRecommendation } from '@/app/(dashboard)/issues/actions';

const DECISION_TOAST: Record<
  'Accepted' | 'Rejected' | 'Modified' | 'Dismissed',
  string
> = {
  Accepted: 'Recommendation accepted',
  Rejected: 'Recommendation rejected',
  Modified: 'Recommendation marked as modified',
  Dismissed: 'Recommendation dismissed',
};

export type RecommendationData = {
  id: string;
  title: string;
  description: string | null;
  expectedImpact: string | null;
  rationale: string | null;
  confidence: 'High' | 'Medium' | 'Low' | 'InsufficientEvidence';
  status:
    | 'Pending'
    | 'Accepted'
    | 'Rejected'
    | 'Modified'
    | 'Dismissed'
    | 'Completed';
};

const STATUS_LABEL: Record<RecommendationData['status'], string> = {
  Pending: 'Pending your decision',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
  Modified: 'Modified',
  Dismissed: 'Dismissed',
  Completed: 'Completed',
};

/**
 * A recommendation supports a human decision — it never applies itself.
 * Once decided, the decision is immutable historical fact (enforced
 * server-side in decideOnRecommendation, not just hidden here) — see
 * AGENTS.md's Non-Negotiable #3.
 */
export function RecommendationCard({
  recommendation,
}: {
  recommendation: RecommendationData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(
    decision: 'Accepted' | 'Rejected' | 'Modified' | 'Dismissed',
  ) {
    setError(null);
    startTransition(async () => {
      const result = await decideOnRecommendation({
        recommendationId: recommendation.id,
        decision,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      toast.success(DECISION_TOAST[decision]);
      router.refresh();
    });
  }

  const isDecided = recommendation.status !== 'Pending';

  return (
    <Card className="flex flex-col gap-(--space-2)">
      <div className="flex items-center justify-between">
        <span className="[font:var(--font-h3)]">{recommendation.title}</span>
        <ConfidenceTag confidence={recommendation.confidence} />
      </div>
      {recommendation.description && (
        <p className="text-(--color-text-secondary) [font:var(--font-body)]">
          {recommendation.description}
        </p>
      )}
      {recommendation.expectedImpact && (
        <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
          Expected impact: {recommendation.expectedImpact}
        </p>
      )}
      {recommendation.rationale && (
        <p className="whitespace-pre-wrap text-(--color-text-tertiary) [font:var(--font-caption)]">
          {recommendation.rationale}
        </p>
      )}

      {isDecided ? (
        <span
          className={`self-start [font:var(--font-label)] ${
            recommendation.status === 'Accepted'
              ? 'text-(--color-success)'
              : 'text-(--color-neutral) line-through'
          }`}
        >
          {STATUS_LABEL[recommendation.status]}
        </span>
      ) : (
        <div className="flex flex-col gap-(--space-2)">
          <div className="flex flex-wrap gap-(--space-2)">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => decide('Accepted')}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => decide('Modified')}
            >
              Modify
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => decide('Rejected')}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => decide('Dismissed')}
            >
              Dismiss
            </Button>
          </div>
          {error && (
            <p
              role="alert"
              className="text-(--color-critical) [font:var(--font-caption)]"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
