import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantChat } from './AssistantChat';
import { submitFeedback } from '@/app/(dashboard)/assistant/actions';

vi.mock('@/app/(dashboard)/assistant/actions', () => ({
  submitFeedback: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));

const mockedSubmitFeedback = vi.mocked(submitFeedback);

/** A real ReadableStream body, so response.body.getReader() behaves like
 * the genuine fetch streaming path AssistantChat reads from — not a fake
 * that only looks right in isolation. */
function streamingResponse(chunks: string[], ok = true, status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status });
}

describe('AssistantChat', () => {
  beforeEach(() => {
    mockedSubmitFeedback.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows the suggested questions when there is no conversation yet', () => {
    render(<AssistantChat />);

    expect(
      screen.getByText('Why are deliveries delayed?'),
    ).toBeInTheDocument();
  });

  it('streams the response in as chunks arrive, rendering the accumulated text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      streamingResponse(['Likely tied ', 'to Supplier A.']),
    );
    const user = userEvent.setup();
    render(<AssistantChat />);

    await user.click(screen.getByText('Why are deliveries delayed?'));

    await waitFor(() => {
      expect(screen.getByText('Likely tied to Supplier A.')).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/assistant',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Why are deliveries delayed?'),
      }),
    );
  });

  it('renders a fully-labeled answer as structured sections, including the Evidence panel', async () => {
    const full = [
      'Answer: Deliveries are late because of Supplier A.',
      'Evidence: 14 delays in 30 days, up from 6.',
      'Explanation: A slowdown from Supplier A likely triggered the backlog.',
      'Uncertainty: A longer history would help confirm this.',
      'Recommended next step: Reach out to Supplier A directly.',
    ].join('\n\n');
    vi.mocked(fetch).mockResolvedValue(streamingResponse([full]));
    const user = userEvent.setup();
    render(<AssistantChat />);

    await user.click(screen.getByText('Why are deliveries delayed?'));

    expect(
      await screen.findByText('Deliveries are late because of Supplier A.'),
    ).toBeInTheDocument();
    expect(screen.getByText('14 delays in 30 days, up from 6.')).toBeInTheDocument();
    expect(screen.getByText('Reach out to Supplier A directly.')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
  });

  it('falls back to plain text when the answer is missing a section', async () => {
    const incomplete = [
      'Answer: Deliveries are late because of Supplier A.',
      'Evidence: 14 delays in 30 days, up from 6.',
    ].join('\n\n');
    vi.mocked(fetch).mockResolvedValue(streamingResponse([incomplete]));
    const user = userEvent.setup();
    render(<AssistantChat />);

    await user.click(screen.getByText('Why are deliveries delayed?'));

    // The rendered node preserves the raw newlines (`whitespace-pre-wrap`),
    // but testing-library's default text matcher normalizes whitespace to
    // single spaces before comparing — match on that same normalized form
    // rather than the raw multi-line string.
    await waitFor(() => {
      expect(
        screen.getByText(incomplete.replace(/\n+/g, ' ')),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Evidence')).not.toBeInTheDocument();
  });

  it('shows an error and removes the pending assistant bubble when the request fails', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Too many questions.' } }), {
        status: 429,
      }),
    );
    const user = userEvent.setup();
    render(<AssistantChat />);

    await user.click(screen.getByText('Why are deliveries delayed?'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many questions.',
    );
    expect(screen.queryByText('Thinking…')).not.toBeInTheDocument();
  });

  it('sends real feedback for a rendered answer and reflects the pressed state', async () => {
    vi.mocked(fetch).mockResolvedValue(streamingResponse(['Likely Supplier A.']));
    const user = userEvent.setup();
    render(<AssistantChat />);

    await user.click(screen.getByText('Why are deliveries delayed?'));
    await screen.findByText('Likely Supplier A.');

    const helpfulButton = screen.getByRole('button', {
      name: 'This answer was helpful',
    });
    await user.click(helpfulButton);

    await waitFor(() => {
      expect(mockedSubmitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'AIInteraction', type: 'Helpful' }),
      );
    });
    expect(helpfulButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('pre-fills but never auto-sends a seeded initial question', () => {
    render(<AssistantChat initialQuestion="Why are deliveries late?" />);

    expect(
      screen.getByPlaceholderText('Ask about your operations...'),
    ).toHaveValue('Why are deliveries late?');
    expect(fetch).not.toHaveBeenCalled();
  });
});
