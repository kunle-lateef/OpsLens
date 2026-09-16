import { detectInsights } from './detect-insights';
import { explainRootCause } from './explain-root-cause';
import { createIssueFromInsight } from './create-issue-from-insight';
import { generateRecommendations } from './generate-recommendations';
import { recomputeHealthScore } from '@/lib/health-score';
import { logger } from '@/lib/logger';

/**
 * Runs the full intelligence pipeline for one organization's
 * already-persisted data — Detect Insights -> Explain Root Cause ->
 * [deterministic] create Issue -> Generate Recommendations -> recompute
 * Health Score — see architecture.md's AI Processing section.
 *
 * Plain orchestrator with no Workflow SDK dependency, so it's directly
 * callable from prisma/seed.ts (which runs standalone, outside the Next.js
 * app's workflow runtime). The real ingestion pipeline instead calls each
 * stage through its own 'use step' wrapper in lib/workflows.ts, for
 * per-stage retry isolation — see that file's comment for why this isn't
 * duplicated logic.
 */
export async function analyzeOrganization(
  organizationId: string,
): Promise<void> {
  const insightIds = await detectInsights(organizationId);

  for (const insightId of insightIds) {
    await explainRootCause(insightId);
    const result = await createIssueFromInsight(insightId);
    // Only a newly-created Issue gets Recommendations generated — see
    // create-issue-from-insight.ts's CreateIssueResult doc comment for why
    // re-running this for a pre-existing Issue would duplicate Pending
    // recommendations alongside ones a human may have already decided on.
    if (result?.isNew) {
      await generateRecommendations(result.issueId);
    }
  }

  await recomputeHealthScore(organizationId);
  logger.info('analyze_organization.completed', {
    organizationId,
    insightCount: insightIds.length,
  });
}
