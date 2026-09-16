import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusStepper } from './StatusStepper';

describe('StatusStepper', () => {
  it('renders Dismissed as a terminal branch with strikethrough, not a step on the line', () => {
    render(<StatusStepper status="Dismissed" />);

    expect(screen.getByText('Dismissed')).toHaveClass('line-through');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('marks only the current step with aria-current, not steps before or after it', () => {
    render(<StatusStepper status="Acknowledged" />);

    expect(screen.getByText('Acknowledged').closest('span')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByText('InProgress').closest('span')).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByText('Detected').closest('span')).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('renders all five non-terminal steps in order', () => {
    render(<StatusStepper status="Detected" />);

    const list = screen.getByRole('list', { name: 'Issue status' });
    expect(list).toHaveTextContent('Detected');
    expect(list).toHaveTextContent('Reviewed');
    expect(list).toHaveTextContent('Acknowledged');
    expect(list).toHaveTextContent('InProgress');
    expect(list).toHaveTextContent('Resolved');
  });
});
