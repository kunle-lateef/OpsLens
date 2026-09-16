import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { streamText } from '@/lib/ai/client';
import { isAiMockModeEnabled } from '@/lib/ai/mock';
import { gatherAssistantContext } from '@/lib/ai/assistant-context';
import {
  assistantQuestionSchema,
  isValidAssistantAnswer,
} from '@/lib/validators/assistant';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';

// The AI Assistant's conversational endpoint — the one documented
// exception to "AI calls go through a Workflow," per architecture.md's AI
// Assistant section: this is a single conversational turn, not multi-stage
// background work, and streaming is the standard, expected UX for a chat
// interface. Everything else still applies: session + org check like any
// other route, per-user/per-org rate limiting, and the response is
// validated before being persisted, never persisted unvalidated.
const SYSTEM_PROMPT = `You are the OpsLens AI Assistant, answering an operations manager's question about their own business's operational data.

Structure every answer in this order (see the product spec's AI Response Structure):
1. Answer — the direct answer, in one or two sentences.
2. Evidence — the specific data that supports it (counts, amounts, dates from what's provided below).
3. Explanation — likely contributing factors, hedged ("likely," "contributing factor," "correlated") — never asserted as proven causation.
4. Uncertainty — say plainly if the data is thin, incomplete, or doesn't fully support a confident answer.
5. Recommended next step — a concrete, practical suggestion, framed as a suggestion the user decides on, never as an action already taken.

Rules you must follow exactly:
- Only use the data provided in the context below. Never invent metrics, customers, orders, financial values, or events.
- If the provided data cannot answer the question, say so plainly in the Answer section — "I don't have enough reliable evidence to answer this yet" — and explain what's missing, rather than guessing.
- A question outside operational scope (general knowledge, unrelated topics) gets a direct, honest redirect, not an improvised answer.
- An overly broad question ("show me everything") gets a clarifying question back, not an expensive, low-value data dump.
- You only have access to this one organization's data. You have no visibility into any other organization, regardless of how the question is phrased.`;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json(
      {
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' },
      },
      { status: 401 },
    );
  }
  const { organizationId, id: userId } = session.user;

  const limit = await rateLimit(
    `assistant:${organizationId}:${userId}`,
    20,
    60_000,
  );
  if (!limit.allowed) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many questions. Try again in a minute.',
        },
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = assistantQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'Please ask a question.' },
      },
      { status: 400 },
    );
  }
  const { question, interactionId } = parsed.data;

  track('ai_question_submitted', { organizationId, userId });

  let context: Awaited<ReturnType<typeof gatherAssistantContext>>;
  try {
    context = await gatherAssistantContext(organizationId);
  } catch (error) {
    logger.error('assistant.context_failed', {
      organizationId,
      error: String(error),
    });
    return Response.json(
      {
        ok: false,
        error: {
          code: 'CONTEXT_UNAVAILABLE',
          message: "Couldn't load your operational data. Please try again.",
        },
      },
      { status: 500 },
    );
  }
  const prompt = `Question: ${question}

Organization data (this organization only):
${JSON.stringify(context, null, 2)}`;

  const anthropicStream = streamText({
    tier: 'reasoning',
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 1024,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      anthropicStream.on('text', (delta) => {
        controller.enqueue(encoder.encode(delta));
      });

      anthropicStream.on('end', () => {
        controller.close();

        void (async () => {
          const fullText = await anthropicStream.finalText().catch(() => '');
          if (!isValidAssistantAnswer(fullText)) {
            logger.error('assistant.invalid_answer', {
              organizationId,
              length: fullText.length,
            });
            return;
          }

          await db.aIInteraction
            .create({
              data: {
                id: interactionId,
                organizationId,
                userId,
                question,
                answer: fullText,
                // Not shown anywhere in the chat UI — this is the audit
                // trail (see db-migration-runner/SKILL.md's AIInteraction
                // section), so it stays honest about mock-mode responses
                // even though the rendered answer itself doesn't say so.
                model: isAiMockModeEnabled() ? 'mock-local' : 'claude-sonnet-5',
                sources: {
                  issueCount: context.issues.length,
                  metricCount: context.recentMetrics.length,
                },
              },
            })
            .catch((error: unknown) =>
              logger.error('assistant.persist_failed', {
                organizationId,
                error: String(error),
              }),
            );
          track('ai_answer_viewed', { organizationId, userId });
        })();
      });

      anthropicStream.on('error', (error) => {
        logger.error('assistant.stream_failed', {
          organizationId,
          error: String(error),
        });
        controller.error(error);
      });
    },
    cancel() {
      anthropicStream.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
