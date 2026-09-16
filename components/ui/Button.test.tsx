import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children and forwards a click handler', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('merges a custom className with the variant classes instead of overwriting them', () => {
    render(<Button className="custom-class">Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button.className).toContain('custom-class');
    expect(button.className).toContain('bg-(--color-brand-solid)');
  });

  it('disables the button and does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
