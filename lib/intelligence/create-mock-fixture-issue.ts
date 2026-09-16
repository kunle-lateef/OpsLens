import { db } from '@/lib/db';
import { calculatePriority } from '@/lib/prioritization';
import { estimateImpactFromInvoices } from '@/lib/intelligence/estimate-impact';
import {
  createNotification,
  issueSeverityToNotificationSeverity,
} from '@/lib/notifications';
import {
  isAiMockModeEnabled,
  getMockStructuredOutput,
  MOCK_FIXTURE_MARKER,
} from '@/lib/ai/mock';
import { logger } from '@/lib/logger';

// Test-only fixture — NOT part of the real pipeline (lib/workflows.ts never
// calls this, and neither does analyzeOrganization). Only prisma/seed.ts
// calls it, and only when AI_MOCK_MODE is on.
//
// Why this exists: a freshly-detected Insight can never organically cross
// create-issue-from-insight.ts's PRIORITY_THRESHOLD_SCORE, regardless of
// severity/confidence — see lib/prioritization.ts's calculatePriority. Its
// urgency factor floors at 0.2 (an insight detected moments ago is, by
// definition, not yet urgent) and its customerImpact factor floors at 0.1
// unless real complaints already exist dated after detection. Multiplied
// together those two floors alone cap the score at 2, far under the
// threshold of 15 — true of genuine Claude output in this exact scenario
// too, not a mock-specific gap. So testing the Issue Detail /
// Recommendation / Notification UI needs either (a) real elapsed time, or
// (b) a fixture like this one that backdates detectedAt to simulate an
// insight that's been sitting for a few days, same as a real one would
// eventually become. Only the priority *inputs* (detectedAt, in particular)
// are adjusted for testing purposes — the score itself still comes from the
// real calculatePriority function, never hardcoded.
export async function createMockFixtureIssue(
  organizationId: string,
): Promise<void> {
  if (!isAiMockModeEnabled()) {
    logger.info('create_mock_fixture_issue.skipped_not_mock_mode', {
      organizationId,
    });
    return;
  }

  // MOCK_FIXTURE_MARKER lives in Evidence.sourceId, a field no component
  // renders — this is how idempotency is checked without matching on any
  // user-visible text (the content itself is written to read as ordinary
  // output, not obviously-synthetic placeholder text — see lib/ai/mock.ts).
  const existingMarker = await db.evidence.findFirst({
    where: { sourceId: MOCK_FIXTURE_MARKER, insight: { organizationId } },
  });
  if (existingMarker) {
    logger.info('create_mock_fixture_issue.already_exists', {
      organizationId,
    });
    return;
  }

  // Backdated on purpose — see the doc comment above. Four days gives
  // urgency = min(1, 96/72) = 1, the formula's actual maximum.
  const detectedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

  const mockInsight = getMockStructuredOutput('report_insights') as {
    insights: Array<{
      type: string;
      title: string;
      summary: string;
      severity: 'Critical' | 'High' | 'Medium' | 'Low';
      confidence: 'High' | 'Medium' | 'Low' | 'InsufficientEvidence';
      impactScore?: number;
      evidence: Array<{
        sourceType: string;
        description: string;
        metricValue?: number;
        comparisonValue?: number;
        period?: string;
        relevanceScore?: number;
      }>;
    }>;
  };
  const mockRootCause = getMockStructuredOutput('report_root_cause') as {
    rootCauseNarrative: string;
    contributingFactors: Array<{
      description: string;
      relevanceScore?: number;
    }>;
  };
  const source = mockInsight.insights[0];

  const insight = await db.insight.create({
    data: {
      organizationId,
      type: source.type,
      title: source.title,
      summary: source.summary,
      severity: source.severity,
      confidence: source.confidence,
      impactScore: source.impactScore,
      detectedAt,
      rootCauseNarrative: mockRootCause.rootCauseNarrative,
      evidence: {
        create: [
          ...source.evidence.map((e, i) => ({
            sourceType: e.sourceType,
            description: e.description,
            metricValue: e.metricValue,
            comparisonValue: e.comparisonValue,
            period: e.period,
            relevanceScore: e.relevanceScore,
            // Attach the invisible idempotency marker to the first evidence
            // row rather than a separate, purely-synthetic row — one fewer
            // "why does this exist" question for anyone inspecting the data.
            sourceId: i === 0 ? MOCK_FIXTURE_MARKER : undefined,
          })),
          ...mockRootCause.contributingFactors.map((factor) => ({
            sourceType: 'contributing_factor',
            description: factor.description,
            relevanceScore: factor.relevanceScore,
          })),
          // A plausible-reading connection to the org's real overdue
          // invoices, specifically so isInvoiceRelated (below) finds it and
          // the Issue gets a genuine, computed Business Impact figure
          // instead of always rendering "Not yet quantified" in this
          // fixture.
          {
            sourceType: 'metric',
            description:
              'Overdue invoices among affected customers have also increased over the same period.',
            relevanceScore: 0.5,
          },
        ],
      },
    },
    include: { evidence: true },
  });

  const affectedCustomerCount = await db.complaint.count({
    where: { organizationId, createdAt: { gte: detectedAt } },
  });

  const priority = calculatePriority({
    severity: insight.severity,
    confidence: insight.confidence,
    impactScore: insight.impactScore,
    affectedCustomerCount,
    ageInHours: (Date.now() - detectedAt.getTime()) / (60 * 60 * 1000),
  });

  // Same real gate create-issue-from-insight.ts applies to genuine output —
  // see its own isInvoiceRelated check.
  const isInvoiceRelated = insight.evidence.some(
    (evidence) =>
      /invoice|overdue/i.test(evidence.sourceType) ||
      /invoice|overdue/i.test(evidence.description),
  );
  let impact: ReturnType<typeof estimateImpactFromInvoices> = null;
  if (isInvoiceRelated) {
    const overdueInvoices = await db.invoice.findMany({
      where: { organizationId, status: 'overdue', dueAt: { lte: detectedAt } },
      select: { amount: true, currency: true },
    });
    impact = estimateImpactFromInvoices(
      overdueInvoices.map((invoice) => ({
        amount: Number(invoice.amount),
        currency: invoice.currency,
      })),
    );
  }

  const issue = await db.issue.create({
    data: {
      organizationId,
      insightId: insight.id,
      title: insight.title,
      description: insight.summary,
      severity: insight.severity,
      priorityScore: priority.score,
      priorityAlgorithmVersion: priority.algorithmVersion,
      status: 'Detected',
      detectedAt,
      impactAmount: impact?.amount,
      impactCurrency: impact?.currency,
    },
  });

  const mockRecommendations = getMockStructuredOutput(
    'report_recommendations',
  ) as {
    recommendations: Array<{
      title: string;
      description: string;
      expectedImpact?: string;
      confidence: 'High' | 'Medium' | 'Low' | 'InsufficientEvidence';
      rationale: string;
    }>;
  };

  await db.recommendation.createMany({
    data: mockRecommendations.recommendations.map((r) => ({
      organizationId,
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
    organizationId,
    severity: issueSeverityToNotificationSeverity(issue.severity),
    message: `New ${issue.severity} issue: ${issue.title}`,
    linkUrl: `/issues/${issue.id}`,
    eventId: issue.id,
  });
  await createNotification({
    organizationId,
    severity: issueSeverityToNotificationSeverity(issue.severity),
    message: `Recommendation pending your review: ${issue.title}`,
    linkUrl: `/issues/${issue.id}`,
    eventId: issue.id,
  });

  logger.info('create_mock_fixture_issue.completed', {
    organizationId,
    issueId: issue.id,
    priorityLabel: priority.label,
  });
}
