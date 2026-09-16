import { EventEmitter } from 'events';
import { env } from '@/lib/env';
import type { TextStream } from '@/lib/ai/client';

// Dev-only stand-in for the real Claude API — see AGENTS.md's "walk me
// through Deepseek" conversation: the developer needed to exercise the
// full ingestion → insight → issue → recommendation pipeline before a real
// ANTHROPIC_API_KEY was available. Every fixture below still passes through
// the exact same Zod validation in lib/ai/schemas.ts that real Claude output
// does — this replaces the network call, not the trust boundary.
//
// Hard-gated to non-production so this can never fabricate a "real" AI
// conclusion for an actual customer, which is precisely the failure
// AGENTS.md's core principle exists to prevent. `NODE_ENV` gating is
// deliberate over relying on the developer to remember to unset
// AI_MOCK_MODE before deploying: Vercel Preview/Production builds always
// set NODE_ENV=production, so this stays off even if the env var were left
// set by accident. This is the load-bearing safety mechanism — the fixture
// content below is deliberately written to read as ordinary, plausible
// output (not visibly stamped "MOCK" in the UI, per the developer's
// request) precisely because this gate is what keeps it out of anything but
// a local dev session, not a text label a viewer might or might not notice.
export function isAiMockModeEnabled(): boolean {
  return env.AI_MOCK_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

// Internal-only marker (never rendered anywhere in the UI — stored in
// Evidence.sourceId, which no component reads) so
// lib/intelligence/create-mock-fixture-issue.ts can tell whether it's
// already run for an organization without matching on visible text.
export const MOCK_FIXTURE_MARKER = 'opslens-mock-fixture';

// Grounded in prisma/seed.ts's own demo narrative (Supplier A begins
// responding more slowly -> inventory drops -> warehouse backlog ->
// delivery delays -> complaints) so the content reads as a plausible
// analysis of that org's data, in the same hedged style
// lib/intelligence/detect-insights.ts's real system prompt requires —
// rather than as obviously-synthetic placeholder text.
function mockInsightDetection() {
  return {
    insights: [
      {
        type: 'DELIVERY_DELAYED',
        title: 'Delivery delays have increased over the past two weeks',
        summary:
          'The number of delayed deliveries has risen sharply since the start of week two, alongside a corresponding increase in customer complaints referencing late delivery. The pattern is concentrated among orders fulfilled through Supplier A.',
        severity: 'High',
        confidence: 'Medium',
        impactScore: 62,
        evidence: [
          {
            sourceType: 'metric',
            description:
              'Delivery delay count over the last 30 days is 14, compared with a baseline of 6 over the prior period.',
            metricValue: 14,
            comparisonValue: 6,
            period: 'last 30 days',
            relevanceScore: 0.8,
          },
          {
            sourceType: 'event',
            description:
              'A supplier delay was recorded for Supplier A roughly two weeks ago, shortly before delivery delays began trending upward.',
            relevanceScore: 0.7,
          },
        ],
      },
    ],
  };
}

function mockRootCause() {
  return {
    rootCauseNarrative:
      "The rise in delivery delays is likely connected to a slowdown from Supplier A that began roughly two weeks ago. A drop in inventory availability and a reported warehouse backlog followed shortly after, which is consistent with a single upstream disruption working through the fulfillment chain — though the data available doesn't fully rule out other contributing factors.",
    contributingFactors: [
      {
        description:
          "Supplier A's response time appears to have slowed starting in week two, ahead of the increase in delivery delays.",
        relevanceScore: 0.8,
      },
      {
        description:
          'A warehouse backlog was recorded shortly after inventory levels dropped, consistent with a downstream effect of reduced supply.',
        relevanceScore: 0.6,
      },
    ],
  };
}

function mockRecommendations() {
  return {
    recommendations: [
      {
        title: "Review Supplier A's current order fulfillment performance",
        description:
          'Reach out to Supplier A to understand the cause of the recent slowdown and get an expected recovery timeline before more orders are affected.',
        expectedImpact:
          'Could reduce further delivery delays and the complaints that tend to follow them.',
        confidence: 'Medium',
        rationale:
          'The available evidence points to Supplier A as the likely originating factor, so addressing it directly is the most targeted next step.',
      },
    ],
  };
}

function mockWeeklyReport() {
  return {
    biggestWins: [
      'Order volume held steady week over week despite the delivery disruption.',
    ],
    biggestRisks: [
      'Delivery delays and the complaints linked to them continued to climb for a second consecutive week.',
    ],
    anomalies: [
      'A cluster of delayed deliveries traces back to a single supplier rather than a broader fulfillment issue.',
    ],
    predictedRisks: [
      'If the current pattern continues, complaint volume could keep rising over the coming week.',
    ],
    recommendedPriorities: [
      "Follow up with Supplier A on their delivery timeline before the backlog grows further.",
    ],
  };
}

/**
 * Returns a schema-valid fixture for the given tool_choice name — see
 * lib/ai/schemas.ts for the schema each of these must satisfy, and the
 * lib/intelligence/*.ts files for which toolName each pipeline stage passes.
 */
export function getMockStructuredOutput(toolName: string): unknown {
  switch (toolName) {
    case 'report_insights':
      return mockInsightDetection();
    case 'report_root_cause':
      return mockRootCause();
    case 'report_recommendations':
      return mockRecommendations();
    case 'report_weekly_summary':
      return mockWeeklyReport();
    default:
      throw new Error(`No mock fixture registered for tool "${toolName}".`);
  }
}

// Same narrative and the same Answer/Evidence/Explanation/Uncertainty/
// Recommended-next-step structure app/api/assistant/route.ts's real system
// prompt requires. Static regardless of the question actually asked — see
// createMockMessageStream's doc comment below for why that's an accepted
// limitation here, not something worth building a real inference step for.
const MOCK_ASSISTANT_ANSWER = `Answer: Deliveries have been taking longer over the past two weeks, and the pattern traces mainly to Supplier A.

Evidence: Delivery delay counts rose to 14 in the last 30 days, up from a baseline of 6, and a supplier delay was logged for Supplier A shortly before the increase began.

Explanation: A slowdown from Supplier A likely triggered a drop in available inventory and a subsequent warehouse backlog, both of which are consistent with delays working through the rest of the fulfillment chain.

Uncertainty: This points to Supplier A specifically, but a closer comparison against their historical performance would help confirm how unusual this slowdown actually is.

Recommended next step: Consider reaching out to Supplier A directly to understand the cause and get a timeline for recovery.`;

/**
 * Fakes just enough of the Anthropic SDK's MessageStream surface for
 * app/api/assistant/route.ts's usage (`.on('text'|'end'|'error')`,
 * `.finalText()`, `.abort()`) — streamed in small chunks on a timer so the
 * UI's streaming behavior is actually exercised, not just its final state.
 * Returns the same fixed answer regardless of the question asked; making
 * this vary by question would mean reimplementing a small inference engine
 * just for local testing, which is out of proportion to what this exists
 * for (exercising the chat UI, not evaluating answer quality — that's what
 * lib/ai/evaluation.test.ts's live-Claude suite is for).
 */
export function createMockMessageStream(): TextStream {
  const emitter = new EventEmitter();
  const words = MOCK_ASSISTANT_ANSWER.split(' ');
  let index = 0;
  let aborted = false;

  const emitNext = () => {
    if (aborted) return;
    if (index >= words.length) {
      emitter.emit('end');
      return;
    }
    const chunk = (index === 0 ? '' : ' ') + words[index];
    emitter.emit('text', chunk);
    index += 1;
    setTimeout(emitNext, 15);
  };
  // Deferred so the caller's `.on(...)` calls (registered synchronously
  // right after this function returns) are attached before the first emit.
  setTimeout(emitNext, 10);

  return {
    on: (event: string, listener: (...args: never[]) => void) => {
      emitter.on(event, listener as Parameters<typeof emitter.on>[1]);
      return emitter;
    },
    finalText: async () => MOCK_ASSISTANT_ANSWER,
    abort: () => {
      aborted = true;
      emitter.removeAllListeners();
    },
  };
}
