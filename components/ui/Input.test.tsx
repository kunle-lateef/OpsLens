import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows the hint and wires it via aria-describedby when there is no error', () => {
    render(<Input label="Password" hint="At least 8 characters" />);
    const input = screen.getByLabelText('Password');
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'At least 8 characters',
    );
  });

  it('suppresses the hint in favor of the error when both are given', () => {
    render(
      <Input
        label="Password"
        hint="At least 8 characters"
        error="Password is too short"
      />,
    );
    expect(screen.getByText('Password is too short')).toBeInTheDocument();
    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument();
  });

  it('marks the input aria-invalid and links the error via aria-describedby', () => {
    render(<Input label="Email" error="Invalid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Invalid email',
    );
  });
});
