'use client';

import { useState, useRef } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, ScrollText } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { submitFeedback } from '@/app/(dashboard)/assistant/actions';

// The real system prompt (app/api/assistant/route.ts) asks Claude to
// structure every answer as Answer/Evidence/Explanation/Uncertainty/
// Recommended next step, in that order — but it's a structural instruction,
// not an exact output template, so a real response could format the labels
// slightly differently (bold, different casing) or, rarely, not follow the
// structure at all. This parser is deliberately strict: it only returns a
// structured result when it finds all five labels, in the right order, each
// with real content — anything else (including a mid-stream partial
// answer) falls back to plain text rather than rendering a guessed or
// half-broken structure.
const SECTION_LABELS = [
  'Answer',
  'Evidence',
  'Explanation',
  'Uncertainty',
  'Recommended next step',
] as const;

type StructuredAnswer = {
  answer: string;
  evidence: string;
  explanation: string;
  uncertainty: string;
  recommendedNext: string;
};

function parseStructuredAnswer(content: string): StructuredAnswer | null {
  const pattern = new RegExp(
    `\\*{0,2}(${SECTION_LABELS.join('|')})\\*{0,2}:\\s*`,
    'gi',
  );
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== SECTION_LABELS.length) return null;

  const inOrder = matches.every(
    (match, index) =>
      match[1].toLowerCase() === SECTION_LABELS[index].toLowerCase(),
  );
  if (!inOrder) return null;

  const sections = matches.map((match, index) => {
    const start = match.index! + match[0].length;
    const end =
      index + 1 < matches.length ? matches[index + 1].index! : content.length;
    return content.slice(start, end).trim();
  });
  if (sections.some((section) => !section)) return null;

  const [answer, evidence, explanation, uncertainty, recommendedNext] =
    sections;
  return { answer, evidence, explanation, uncertainty, recommendedNext };
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  feedback?: 'Helpful' | 'NotHelpful';
};

const SUGGESTED_QUESTIONS = [
  'What are the three most important operational problems right now?',
  'Why are deliveries delayed?',
  'Which customers are at risk?',
];

/**
 * The conversational AI Assistant — see architecture.md's AI Assistant
 * section. Reads the route's raw text stream directly (no SDK needed
 * client-side) and renders it as it arrives, per design-system.md's Motion
 * section ("the streaming AI Assistant reply" is one of the few animations
 * that's functional, not decorative).
 *
 * `initialQuestion` (from /assistant?seed=... — see app/(dashboard)/
 * assistant/page.tsx) pre-fills the input when the Assistant is opened from
 * an "Ask AI about this" link elsewhere in the app. It only pre-fills —
 * never auto-sends — so the user still confirms what's actually being
 * asked before it goes anywhere.
 */
export function AssistantChat({
  initialQuestion,
}: {
  initialQuestion?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuestion ?? '');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function sendQuestion(question: string) {
    if (!question.trim() || isSending) return;

    setError(null);
    setInput('');
    setIsSending(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
    };
    const interactionId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: interactionId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, interactionId }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error?.message ??
            "We couldn't reach the AI Assistant. Please try again.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === interactionId
              ? { ...message, content: message.content + chunk }
              : message,
          ),
        );
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === interactionId
            ? { ...message, isStreaming: false }
            : message,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setMessages((prev) =>
        prev.filter((message) => message.id !== interactionId),
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleFeedback(
    messageId: string,
    type: 'Helpful' | 'NotHelpful',
  ) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, feedback: type } : message,
      ),
    );
    await submitFeedback({
      targetType: 'AIInteraction',
      targetId: messageId,
      type,
    });
  }

  return (
    <div className="flex h-full flex-col gap-(--space-4)">
      {initialQuestion && messages.length === 0 && (
        <p className="rounded-(--radius-sm) bg-(--color-brand-tint-subtle) px-(--space-3) py-(--space-2) text-(--color-brand-accent) [font:var(--font-caption)]">
          ↳ Opened from context — question pre-filled below.
        </p>
      )}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation with the AI Assistant"
        className="flex flex-1 flex-col gap-(--space-3) overflow-y-auto"
      >
        {messages.length === 0 && (
          <Card className="flex flex-col gap-(--space-2)">
            <p className="text-(--color-text-secondary) [font:var(--font-body)]">
              Ask a question about your operational data — orders, deliveries,
              invoices, complaints, or the issues OpsLens has already detected.
            </p>
            <div className="flex flex-wrap gap-(--space-2)">
              {SUGGESTED_QUESTIONS.map((question) => (
                <Button
                  key={question}
                  size="sm"
                  variant="secondary"
                  onClick={() => sendQuestion(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
            <p className="text-(--color-text-tertiary) [font:var(--font-caption)]">
              Answers come only from your real data — including an honest
              &quot;not enough evidence yet&quot; when it doesn&apos;t have
              enough.
            </p>
          </Card>
        )}

        {messages.map((message) => {
          const structured =
            message.role === 'assistant' &&
            !message.isStreaming &&
            message.content
              ? parseStructuredAnswer(message.content)
              : null;

          return (
            <div
              key={message.id}
              className={
                message.role === 'user'
                  ? 'self-end'
                  : 'flex max-w-[85%] items-start gap-(--space-2) self-start'
              }
            >
              {message.role === 'assistant' && (
                <span
                  aria-hidden="true"
                  className="mt-(--space-0-5) flex h-(--space-6) w-(--space-6) shrink-0 items-center justify-center rounded-(--radius-full) border border-(--color-brand-accent) bg-(--color-brand-tint-subtle)"
                >
                  <MessageSquare
                    size={12}
                    aria-hidden="true"
                    className="text-(--color-brand-accent)"
                  />
                </span>
              )}
              <div className="flex-1">
                <Card
                  className={
                    message.role === 'user'
                      ? 'bg-(--color-brand-tint-medium) [font:var(--font-body)]'
                      : 'flex flex-col gap-(--space-3) [font:var(--font-body)]'
                  }
                >
                  {structured ? (
                    <>
                      <p className="whitespace-pre-wrap">
                        {structured.answer}
                      </p>
                      <div className="rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-base) p-(--space-3)">
                        <p className="mb-(--space-1) flex items-center gap-(--space-1) text-(--color-brand-accent) uppercase [font:var(--font-label)]">
                          <ScrollText size={12} aria-hidden="true" />
                          Evidence
                        </p>
                        <p className="whitespace-pre-wrap text-(--color-text-secondary)">
                          {structured.evidence}
                        </p>
                      </div>
                      <p className="whitespace-pre-wrap">
                        {structured.explanation}
                      </p>
                      <p className="whitespace-pre-wrap text-(--color-text-tertiary) italic">
                        {structured.uncertainty}
                      </p>
                      <div className="rounded-(--radius-md) border border-(--color-brand-accent) bg-(--color-brand-tint-subtle) p-(--space-3)">
                        <p className="mb-(--space-1) text-(--color-brand-accent) uppercase [font:var(--font-label)]">
                          Recommended next
                        </p>
                        <p className="whitespace-pre-wrap">
                          {structured.recommendedNext}
                        </p>
                      </div>
                    </>
                  ) : message.content ? (
                    <span className="whitespace-pre-wrap">
                      {message.content}
                    </span>
                  ) : message.isStreaming ? (
                    <span className="flex items-center gap-(--space-1-5) text-(--color-text-secondary)">
                      <span
                        aria-hidden="true"
                        className="flex gap-(--space-0-5)"
                      >
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 animate-pulse rounded-(--radius-full) bg-(--color-text-tertiary) motion-reduce:animate-none"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </span>
                      Thinking…
                    </span>
                  ) : (
                    ''
                  )}
                </Card>
                {message.role === 'assistant' &&
                  !message.isStreaming &&
                  message.content && (
                    <div className="mt-(--space-1) flex items-center gap-(--space-1)">
                      <button
                        type="button"
                        aria-label="This answer was helpful"
                        aria-pressed={message.feedback === 'Helpful'}
                        onClick={() => handleFeedback(message.id, 'Helpful')}
                        className="rounded-(--radius-sm) p-(--space-1) text-(--color-text-tertiary) hover:text-(--color-success) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
                      >
                        <ThumbsUp size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="This answer was not helpful"
                        aria-pressed={message.feedback === 'NotHelpful'}
                        onClick={() =>
                          handleFeedback(message.id, 'NotHelpful')
                        }
                        className="rounded-(--radius-sm) p-(--space-1) text-(--color-text-tertiary) hover:text-(--color-critical) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
                      >
                        <ThumbsDown size={14} aria-hidden="true" />
                      </button>
                    </div>
                  )}
              </div>
            </div>
          );
        })}

        {error && (
          <p
            role="alert"
            className="text-(--color-critical) [font:var(--font-caption)]"
          >
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendQuestion(input);
        }}
        className="flex gap-(--space-2)"
      >
        <label htmlFor="assistant-question" className="sr-only">
          Ask a question about your operational data
        </label>
        <input
          id="assistant-question"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your operations..."
          disabled={isSending}
          className="h-(--space-10) flex-1 rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface-elevated) px-(--space-3) text-(--color-text-primary) [font:var(--font-body)] focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:outline-none"
        />
        <Button type="submit" disabled={isSending || !input.trim()}>
          Ask
        </Button>
      </form>
    </div>
  );
}
