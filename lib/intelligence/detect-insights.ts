import { db } from '@/lib/db';
import { generateStructuredOutput } from '@/lib/ai/client';
import {
  insightDetectionOutputSchema,
  insightDetectionToolSchema,
} from '@/lib/ai/schemas';
import { logger } from '@/lib/logger';

// AI Processing stage 1 — see architecture.md's AI Processing table.
// Grounding rules per security.md's AI Output & Structured Data Trust and
// AGENTS.md's Non-Negotiables: every factual claim must trace to the data
// actually provided, never an invented figure.
const SYSTEM_PROMPT = `You are OpsLens's insight-detection engine for an e-commerce and logistics operations platform.

Rules you must follow exactly:
- Only use the data provided below. Never invent metrics, customers, orders, financial values, events, or causes.
- Every insight's evidence must reference the specific data provided (a metric key, an event type, a count, a time period).
- Confidence must reflect genuine data support: use "InsufficientEvidence" rather than fabricating a numeric-sounding confidence when the data is thin, contradictory, or as plausibly a coincidence as a pattern.
- If nothing in the data warrants an insight, return an empty insights array. Do not manufacture a finding to have something to say.`;

const WINDOW_DAYS = 30;

/**
 * Identifies anomalies, trends, and patterns across an organization's
 * Metric and OperationalEvent data, persisting each as an Insight with its
 * required Evidence. Plain function — no Workflow SDK dependency — so it's
 * callable directly (see prisma/seed.ts) or wrapped as a step (see
 * lib/workflows.ts) for the real ingestion pipeline.
 */
export async function detectInsights(
  organizationId: string,
): Promise<string[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [metrics, events] = await Promise.all([
    db.metric.findMany({
      where: { organizationId, calculatedAt: { gte: since } },
      orderBy: { calculatedAt: 'desc' },
      take: 100,
    }),
    db.operationalEvent.findMany({
      where: { organizationId, timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    }),
  ]);

  if (metrics.length === 0 && events.length === 0) {
    logger.info('detect_insights.no_data', { organizationId });
    return [];
  }

  const prompt = `Metrics from the last ${WINDOW_DAYS} days:
${JSON.stringify(metrics.map((m) => ({ key: m.key, value: m.value, unit: m.unit, periodStart: m.periodStart, periodEnd: m.periodEnd })))}

Operational events from the last ${WINDOW_DAYS} days (most recent first):
${JSON.stringify(events.map((e) => ({ type: e.type, entityType: e.entityType, severity: e.severity, value: e.value, timestamp: e.timestamp })))}

Identify anomalies, trends, risks, and patterns worth surfacing to an operations manager.`;

  let output: unknown;
  try {
    output = await generateStructuredOutput({
      tier: 'reasoning',
      system: SYSTEM_PROMPT,
      prompt,
      toolName: 'report_insights',
      toolDescription:
        'Report the operational insights detected in the provided data.',
      inputSchema: insightDetectionToolSchema,
    });
  } catch (error) {
    logger.error('detect_insights.ai_call_failed', {
      organizationId,
      error: String(error),
    });
    return [];
  }

  const parsed = insightDetectionOutputSchema.safeParse(output);
  if (!parsed.success) {
    logger.error('detect_insights.invalid_output', {
      organizationId,
      issues: parsed.error.issues,
    });
    return [];
  }

  const insightIds: string[] = [];
  for (const insight of parsed.data.insights) {
    const created = await db.insight.create({
      data: {
        organizationId,
        type: insight.type,
        title: insight.title,
        summary: insight.summary,
        severity: insight.severity,
        confidence: insight.confidence,
        impactScore: insight.impactScore,
        detectedAt: new Date(),
        evidence: { create: insight.evidence },
      },
    });
    insightIds.push(created.id);
  }

  logger.info('detect_insights.completed', {
    organizationId,
    count: insightIds.length,
  });
  return insightIds;
}
