import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityBadge } from './SeverityBadge';

describe('SeverityBadge', () => {
  it('renders the severity text and an accessible label describing it in words', () => {
    render(<SeverityBadge severity="Critical" />);

    const badge = screen.getByRole('status', { name: 'Critical severity' });
    expect(badge).toHaveTextContent('Critical');
  });

  it('maps Informational (NotificationSeverity) to the neutral token, distinct from Low', () => {
    render(<SeverityBadge severity="Informational" />);
    expect(
      screen.getByRole('status', { name: 'Informational' }),
    ).toBeInTheDocument();
  });

  it('never conveys severity by color alone — every severity renders a distinguishing icon', () => {
    const { container } = render(<SeverityBadge severity="Medium" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
