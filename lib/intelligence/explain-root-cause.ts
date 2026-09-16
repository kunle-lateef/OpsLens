import { db } from '@/lib/db';
import { generateStructuredOutput } from '@/lib/ai/client';
import { rootCauseOutputSchema, rootCauseToolSchema } from '@/lib/ai/schemas';
import { logger } from '@/lib/logger';

// AI Processing stage 2 — see architecture.md's AI Processing table.
const SYSTEM_PROMPT = `You explain the likely root cause behind an already-detected operational insight for OpsLens.

Rules:
- Only use the evidence provided. Never invent contributing factors not supported by it.
- Use hedged language only: "likely," "contributing factor," "correlated," "possible explanation." Never assert proven causation from correlation.
- If the evidence doesn't support a clear explanation, say so plainly rather than guessing.`;

/**
 * For an Insight that clears the confidence bar, constructs a
 * contributing-factor narrative and attaches it — see architecture.md's AI
 * Processing table. Each contributing factor becomes its own Evidence row
 * (sourceType: 'contributing_factor') so a future CausalChain visualization
 * has real rows to link each node back to — see design-system.md.
 */
export async function explainRootCause(insightId: string): Promise<void> {
  const insight = await db.insight.findUniqueOrThrow({
    where: { id: insightId },
    include: { evidence: true },
  });

  if (insight.confidence === 'InsufficientEvidence') return;

  const prompt = `Insight: ${insight.title}
Summary: ${insight.summary}
Severity: ${insight.severity}
Confidence: ${insight.confidence}

Supporting evidence:
${JSON.stringify(
  insight.evidence.map((e) => ({
    sourceType: e.sourceType,
    description: e.description,
    metricValue: e.metricValue,
    comparisonValue: e.comparisonValue,
    period: e.period,
  })),
)}

Explain the likely contributing factors behind this insight.`;

  let output: unknown;
  try {
    output = await generateStructuredOutput({
      tier: 'reasoning',
      system: SYSTEM_PROMPT,
      prompt,
      toolName: 'report_root_cause',
      toolDescription:
        'Report the likely root cause and contributing factors for this insight.',
      inputSchema: rootCauseToolSchema,
    });
  } catch (error) {
    logger.error('explain_root_cause.ai_call_failed', {
      insightId,
      error: String(error),
    });
    return;
  }

  const parsed = rootCauseOutputSchema.safeParse(output);
  if (!parsed.success) {
    logger.error('explain_root_cause.invalid_output', {
      insightId,
      issues: parsed.error.issues,
    });
    return;
  }

  await db.$transaction([
    db.insight.update({
      where: { id: insightId },
      data: { rootCauseNarrative: parsed.data.rootCauseNarrative },
    }),
    ...parsed.data.contributingFactors.map((factor) =>
      db.evidence.create({
        data: {
          insightId,
          sourceType: 'contributing_factor',
          description: factor.description,
          relevanceScore: factor.relevanceScore,
        },
      }),
    ),
  ]);
}
