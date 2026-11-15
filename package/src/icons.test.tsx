import { render } from '@testing-library/react';
import React from 'react';
import * as icons from './icons';

describe('icons', () => {
  it.each(Object.entries(icons))('%s is a hidden 16px svg, sizable', (_, Icon) => {
    const { container, rerender } = render(<Icon />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '16');
    rerender(<Icon size={12} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '12');
  });
});
