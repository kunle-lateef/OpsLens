import { db } from '@/lib/db';
import { generateStructuredOutput } from '@/lib/ai/client';
import {
  recommendationOutputSchema,
  recommendationToolSchema,
} from '@/lib/ai/schemas';
import {
  createNotification,
  issueSeverityToNotificationSeverity,
} from '@/lib/notifications';
import { logger } from '@/lib/logger';

// AI Processing stage 3 — see architecture.md's AI Processing table. Runs
// against Issues, which are themselves created deterministically — see
// create-issue-from-insight.ts.
const SYSTEM_PROMPT = `You generate suggested next actions for an operations manager using OpsLens, based on an already-prioritized operational issue.

Rules:
- Base recommendations only on the issue, its insight, and root cause provided below. Never invent data.
- A recommendation supports a human decision — the user can accept, reject, modify, or dismiss it. Never phrase one as already decided or automatically applied.
- If the evidence doesn't support a confident recommendation, reflect that with a Low or InsufficientEvidence confidence rather than an overconfident suggestion.`;

export async function generateRecommendations(issueId: string): Promise<void> {
  const issue = await db.issue.findUniqueOrThrow({
    where: { id: issueId },
    include: { insight: { include: { evidence: true } } },
  });

  const prompt = `Issue: ${issue.title}
Severity: ${issue.severity}
Priority score: ${issue.priorityScore}

Underlying insight: ${issue.insight.summary}
Root cause: ${issue.insight.rootCauseNarrative ?? 'Not yet established.'}

Evidence:
${JSON.stringify(issue.insight.evidence.map((e) => ({ sourceType: e.sourceType, description: e.description })))}

Suggest practical next actions.`;

  let output: unknown;
  try {
    output = await generateStructuredOutput({
      tier: 'fast',
      system: SYSTEM_PROMPT,
      prompt,
      toolName: 'report_recommendations',
      toolDescription: 'Report the recommended next actions for this issue.',
      inputSchema: recommendationToolSchema,
    });
  } catch (error) {
    logger.error('generate_recommendations.ai_call_failed', {
      issueId,
      error: String(error),
    });
    return;
  }

  const parsed = recommendationOutputSchema.safeParse(output);
  if (!parsed.success) {
    logger.error('generate_recommendations.invalid_output', {
      issueId,
      issues: parsed.error.issues,
    });
    return;
  }

  if (parsed.data.recommendations.length === 0) return;

  await db.recommendation.createMany({
    data: parsed.data.recommendations.map((r) => ({
      organizationId: issue.organizationId,
      issueId: issue.id,
      title: r.title,
      description: r.description,
      expectedImpact: r.expectedImpact,
      confidence: r.confidence,
      rationale: r.rationale,
      status: 'Pending',
    })),
  });

  await createNotification({
    organizationId: issue.organizationId,
    severity: issueSeverityToNotificationSeverity(issue.severity),
    message: `Recommendation pending your review: ${issue.title}`,
    linkUrl: `/issues/${issue.id}`,
    eventId: issue.id,
  });

  logger.info('generate_recommendations.completed', {
    issueId,
    count: parsed.data.recommendations.length,
  });
}
