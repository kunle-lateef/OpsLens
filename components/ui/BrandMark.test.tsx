import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BrandMark } from './BrandMark';

function getSrcs(container: HTMLElement) {
  return Array.from(container.querySelectorAll('img')).map((img) =>
    img.getAttribute('src'),
  );
}

describe('BrandMark', () => {
  it('defaults to the all-white/all-blue lockup (tone="auto") so existing usages are unaffected', () => {
    const { container } = render(<BrandMark variant="horizontal" />);
    expect(getSrcs(container)).toEqual([
      '/logo/opslens-horizontal-white.svg',
      '/logo/opslens-horizontal-blue.svg',
    ]);
  });

  it('uses the color lockup on dark theme when tone="color" is requested', () => {
    const { container } = render(
      <BrandMark variant="horizontal" tone="color" />,
    );
    expect(getSrcs(container)).toEqual([
      '/logo/opslens-horizontal-color.svg',
      '/logo/opslens-horizontal-blue.svg',
    ]);
  });

  it('points the icon variant at the same blue file for both themes under tone="color", since the icon has no legibility concern', () => {
    const { container } = render(<BrandMark variant="icon" tone="color" />);
    expect(getSrcs(container)).toEqual([
      '/logo/opslens-icon-blue.svg',
      '/logo/opslens-icon-blue.svg',
    ]);
  });
});
