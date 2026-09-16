import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RecommendationCard,
  type RecommendationData,
} from './RecommendationCard';
import { decideOnRecommendation } from '@/app/(dashboard)/issues/actions';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args) },
}));

vi.mock('@/app/(dashboard)/issues/actions', () => ({
  decideOnRecommendation: vi.fn(),
}));

const mockedDecide = vi.mocked(decideOnRecommendation);

const baseRecommendation: RecommendationData = {
  id: 'rec-1',
  title: 'Review Supplier A',
  description: 'Reach out to Supplier A about the slowdown.',
  expectedImpact: 'Fewer delayed deliveries',
  rationale: 'Delivery delays correlate with Supplier A.',
  confidence: 'Medium',
  status: 'Pending',
};

describe('RecommendationCard', () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
    mockedDecide.mockReset();
  });

  it('shows all four decision actions while pending, and no status label', () => {
    render(<RecommendationCard recommendation={baseRecommendation} />);

    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modify' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Dismiss' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Pending your decision')).not.toBeInTheDocument();
  });

  it('renders an already-decided Accepted recommendation with no action buttons', () => {
    render(
      <RecommendationCard
        recommendation={{ ...baseRecommendation, status: 'Accepted' }}
      />,
    );

    expect(screen.getByText('Accepted')).toHaveClass('text-(--color-success)');
    expect(
      screen.queryByRole('button', { name: 'Accept' }),
    ).not.toBeInTheDocument();
  });

  it('renders an already-decided Dismissed recommendation with a struck-through label', () => {
    render(
      <RecommendationCard
        recommendation={{ ...baseRecommendation, status: 'Dismissed' }}
      />,
    );

    expect(screen.getByText('Dismissed')).toHaveClass('line-through');
  });

  it('accepting calls the server action with the recommendation id and decision, then toasts and refreshes on success', async () => {
    mockedDecide.mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<RecommendationCard recommendation={baseRecommendation} />);

    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(mockedDecide).toHaveBeenCalledWith({
        recommendationId: 'rec-1',
        decision: 'Accepted',
      });
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Recommendation accepted');
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows the server-returned error message and never toasts or refreshes when the decision fails', async () => {
    mockedDecide.mockResolvedValue({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Viewers cannot decide on recommendations.' },
    });
    const user = userEvent.setup();
    render(<RecommendationCard recommendation={baseRecommendation} />);

    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Viewers cannot decide on recommendations.');
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('disables all four actions while a decision is in flight', async () => {
    let resolveDecision: (value: {
      ok: true;
      data: null;
    }) => void = () => {};
    mockedDecide.mockReturnValue(
      new Promise((resolve) => {
        resolveDecision = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<RecommendationCard recommendation={baseRecommendation} />);

    await user.click(screen.getByRole('button', { name: 'Modify' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: 'Modify' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDisabled();

    resolveDecision({ ok: true, data: null });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Modify' })).not.toBeDisabled();
    });
  });
});
