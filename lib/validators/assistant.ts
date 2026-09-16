import { z } from 'zod';

export const assistantQuestionSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  // Client-generated so the client can attach feedback to this exact answer
  // once the stream completes — the route's response is a raw text stream
  // with no side channel to hand back a server-generated ID. Used as the
  // AIInteraction's primary key; a collision just fails that one create()
  // safely, it can never overwrite an existing row.
  interactionId: z.string().uuid(),
});

// Non-empty, within expected length — see architecture.md's AI Assistant
// section: the response is validated before being persisted, never
// persisted unvalidated. This is a lighter check than the pipeline stages'
// full Zod-schema structural validation (lib/ai/schemas.ts) — the Assistant
// returns free-form prose, not tool-forced structured JSON, so there's no
// fixed shape to validate against beyond "did it actually say something
// reasonable."
export const MIN_ANSWER_LENGTH = 1;
export const MAX_ANSWER_LENGTH = 8000;

export function isValidAssistantAnswer(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.length >= MIN_ANSWER_LENGTH && trimmed.length <= MAX_ANSWER_LENGTH
  );
}
