import { db } from '@/lib/db';

// Every query here is scoped to the requesting user's organization
// explicitly, regardless of what the question asks for — see security.md's
// AI Assistant Guardrails and Multi-Tenant Isolation sections. This is the
// actual enforcement point: the model never sees another organization's
// rows to leak in the first place, so no amount of prompt phrasing can pull
// them out. Every retrieval call the assistant makes goes through this one
// function, so the boundary lives in exactly one place.
export async function gatherAssistantContext(organizationId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    organization,
    issues,
    recommendations,
    metrics,
    overdueInvoices,
    recentComplaints,
    deliveryDelaysBySupplier,
  ] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        name: true,
        healthScore: true,
        healthScoreAlgorithmVersion: true,
      },
    }),
    db.issue.findMany({
      where: { organizationId, status: { notIn: ['Resolved', 'Dismissed'] } },
      include: { insight: true },
      orderBy: { priorityScore: 'desc' },
      take: 20,
    }),
    db.recommendation.findMany({
      where: { organizationId, status: 'Pending' },
      take: 20,
    }),
    db.metric.findMany({
      where: { organizationId, calculatedAt: { gte: since } },
      orderBy: { calculatedAt: 'desc' },
      take: 50,
    }),
    db.invoice.findMany({
      where: { organizationId, status: 'overdue' },
      include: { customer: { select: { name: true } } },
      take: 20,
    }),
    db.complaint.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: { category: true, severity: true, createdAt: true },
      take: 20,
    }),
    db.operationalEvent.groupBy({
      by: ['type'],
      where: {
        organizationId,
        type: 'DELIVERY_DELAYED',
        timestamp: { gte: since },
      },
      _count: true,
    }),
  ]);

  return {
    organization,
    issues: issues.map((issue) => ({
      title: issue.title,
      severity: issue.severity,
      status: issue.status,
      priorityScore: issue.priorityScore,
      confidence: issue.insight.confidence,
      summary: issue.insight.summary,
      rootCause: issue.insight.rootCauseNarrative,
    })),
    pendingRecommendations: recommendations.map((r) => ({
      title: r.title,
      description: r.description,
      confidence: r.confidence,
    })),
    recentMetrics: metrics.map((m) => ({
      key: m.key,
      value: m.value,
      unit: m.unit,
      calculatedAt: m.calculatedAt,
    })),
    overdueInvoices: overdueInvoices.map((inv) => ({
      customer: inv.customer.name,
      amount: Number(inv.amount),
      currency: inv.currency,
      dueAt: inv.dueAt,
    })),
    recentComplaints: recentComplaints,
    deliveryDelayEventCount: deliveryDelaysBySupplier[0]?._count ?? 0,
  };
}

export type AssistantContext = Awaited<
  ReturnType<typeof gatherAssistantContext>
>;
