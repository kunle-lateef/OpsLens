import { db } from '@/lib/db';
import { generateStructuredOutput } from '@/lib/ai/client';
import {
  weeklyReportOutputSchema,
  weeklyReportToolSchema,
} from '@/lib/ai/schemas';
import { logger } from '@/lib/logger';

// Weekly AI Operations Report — see the master spec's section 24. Not one
// of architecture.md's three numbered AI Processing stages (this predates
// that table), but the same trust rules apply: grounded only in this
// organization's data, and the report must distinguish historical facts
// (biggestWins/biggestRisks/anomalies — what actually happened) from AI
// interpretation and prediction (predictedRisks/recommendedPriorities).
const SYSTEM_PROMPT = `You write a concise weekly operations report for OpsLens, an operational intelligence platform.

Rules you must follow exactly:
- Only use the data provided below. Never invent metrics, customers, orders, or events.
- biggestWins, biggestRisks, and anomalies must describe what actually happened this week (historical fact) — do not speculate in these sections.
- predictedRisks is the one place you may forecast forward — hedge it clearly ("may," "could," "risk of") and never state a prediction as a certainty.
- recommendedPriorities are suggestions for the user to evaluate, never framed as decisions already made.
- If a section has nothing genuinely notable, return an empty array for it rather than manufacturing a data point to fill it.`;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function generateWeeklyReport(
  organizationId: string,
  userId: string | null,
): Promise<string> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - WEEK_MS);
  const previousPeriodStart = new Date(periodStart.getTime() - WEEK_MS);

  const [thisWeekEvents, lastWeekEvents, issues, healthScore] =
    await Promise.all([
      db.operationalEvent.findMany({
        where: {
          organizationId,
          timestamp: { gte: periodStart, lt: periodEnd },
        },
        select: { type: true, severity: true, timestamp: true },
      }),
      db.operationalEvent.findMany({
        where: {
          organizationId,
          timestamp: { gte: previousPeriodStart, lt: periodStart },
        },
        select: { type: true, severity: true },
      }),
      db.issue.findMany({
        where: {
          organizationId,
          detectedAt: { gte: periodStart, lt: periodEnd },
        },
        select: { title: true, severity: true, status: true },
      }),
      db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { healthScore: true },
      }),
    ]);

  const prompt = `Current Operational Health Score: ${healthScore.healthScore ?? 'insufficient data'}

This week's operational events (${thisWeekEvents.length} total):
${JSON.stringify(thisWeekEvents)}

Previous week's operational events (${lastWeekEvents.length} total, for comparison):
${JSON.stringify(lastWeekEvents)}

Issues detected this week:
${JSON.stringify(issues)}

Write the weekly report from this data.`;

  let output: unknown;
  let content: unknown;
  try {
    output = await generateStructuredOutput({
      tier: 'reasoning',
      system: SYSTEM_PROMPT,
      prompt,
      toolName: 'report_weekly_summary',
      toolDescription: 'Report the weekly operations summary.',
      inputSchema: weeklyReportToolSchema,
    });
    const parsed = weeklyReportOutputSchema.safeParse(output);
    if (!parsed.success) {
      logger.error('generate_weekly_report.invalid_output', {
        organizationId,
        issues: parsed.error.issues,
      });
      throw new Error(
        'The report could not be generated from the available data.',
      );
    }
    content = parsed.data;
  } catch (error) {
    logger.error('generate_weekly_report.failed', {
      organizationId,
      error: String(error),
    });
    throw error;
  }

  const report = await db.report.create({
    data: {
      organizationId,
      type: 'Weekly',
      periodStart,
      periodEnd,
      content: content as object,
      userId,
    },
  });

  return report.id;
}
