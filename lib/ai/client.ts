import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  isAiMockModeEnabled,
  getMockStructuredOutput,
  createMockMessageStream,
} from '@/lib/ai/mock';

// Claude API wrapper — see architecture.md's Directory Layout and its
// Claude API rationale bullet: one client wrapper is one place to reason
// about prompt-injection and data-boundary risk, instead of several.
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export type ModelTier = 'reasoning' | 'fast';

// Stage-to-model mapping is configured here and is the developer's call to
// change as models improve or costs shift — see architecture.md's AI
// Processing section ("Model tier guidance... is relative, not a fixed
// model identifier"). Insight detection and root-cause explanation use the
// reasoning tier (most prone to false confidence if under-powered);
// recommendation generation uses the fast tier (mostly synthesis).
const MODEL_BY_TIER: Record<ModelTier, string> = {
  reasoning: 'claude-sonnet-5',
  fast: 'claude-haiku-4-5-20251001',
};

export class AiOutputError extends Error {}

/**
 * Forces Claude to return exactly the shape described by `inputSchema` via
 * tool_choice, then hands back the raw (unknown) tool input. The caller is
 * responsible for validating it against the matching Zod schema in
 * lib/ai/schemas.ts before persisting anything — this function only talks
 * to the model, it doesn't establish trust on its own. See security.md's
 * "AI output is never persisted unvalidated."
 */
export async function generateStructuredOutput(options: {
  tier: ModelTier;
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<unknown> {
  if (isAiMockModeEnabled()) {
    logger.warn('ai.mock_mode.structured_output', { toolName: options.toolName });
    return getMockStructuredOutput(options.toolName);
  }

  const response = await anthropic.messages.create({
    model: MODEL_BY_TIER[options.tier],
    max_tokens: options.maxTokens ?? 4096,
    system: options.system,
    messages: [{ role: 'user', content: options.prompt }],
    tools: [
      {
        name: options.toolName,
        description: options.toolDescription,
        input_schema: options.inputSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: options.toolName },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );

  if (!toolUse) {
    logger.error('ai.no_tool_use', {
      toolName: options.toolName,
      stopReason: response.stop_reason,
    });
    throw new AiOutputError(
      'Claude did not return the expected structured output.',
    );
  }

  return toolUse.input;
}

// The minimal surface app/api/assistant/route.ts actually uses off the
// SDK's MessageStream — narrowed to its own type (rather than reusing
// Anthropic.MessageStream directly) so createMockMessageStream() in
// lib/ai/mock.ts can satisfy it too without fighting the real SDK type's
// overloaded `on()` signatures.
export type TextStream = {
  on(event: 'text', listener: (delta: string) => void): unknown;
  on(event: 'end', listener: () => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  finalText(): Promise<string>;
  abort(): void;
};

/**
 * Streams free-form text (not tool-forced structured output) — used only
 * by the AI Assistant's conversational endpoint, architecture.md's one
 * documented exception to "AI calls go through a Workflow." Returns the
 * SDK's MessageStream (narrowed to TextStream, above) so the caller can pipe
 * `.on('text', ...)` deltas into an HTTP response and still call
 * `.finalText()` once it ends; kept in this module rather than exporting the
 * raw Anthropic client so there's still exactly one place that talks to the
 * API directly.
 */
export function streamText(options: {
  tier: ModelTier;
  system: string;
  prompt: string;
  maxTokens?: number;
}): TextStream {
  if (isAiMockModeEnabled()) {
    logger.warn('ai.mock_mode.stream_text', {});
    return createMockMessageStream();
  }

  return anthropic.messages.stream({
    model: MODEL_BY_TIER[options.tier],
    max_tokens: options.maxTokens ?? 1024,
    system: options.system,
    messages: [{ role: 'user', content: options.prompt }],
  }) as unknown as TextStream;
}
