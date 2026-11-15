import { render } from '@mantine-tests/core';
import React from 'react';

interface Options<Props> {
  component: React.ComponentType<any>;
  props: Props;

  /** The Styles API name, as in `.mantine-{name}-root` */
  name: string;

  /** An inner selector that renders with `props` */
  selector?: string;
}

/**
 * Mantine's `attributes` prop reaches the root and inner parts through useStyles, and never
 * leaks onto the root as an `attributes="[object Object]"` attribute
 */
export function itSupportsAttributes<Props>({
  component: Component,
  props,
  name,
  selector,
}: Options<Props>) {
  it('passes the attributes prop to the root and its parts', () => {
    const attributes: Record<string, Record<string, string>> = { root: { 'data-test': 'root' } };
    if (selector) {
      attributes[selector] = { 'data-test': 'part' };
    }
    const { container } = render(<Component {...props} attributes={attributes} />);

    const root = container.querySelector(`.mantine-${name}-root`);
    expect(root).toHaveAttribute('data-test', 'root');
    expect(root).not.toHaveAttribute('attributes');
    if (selector) {
      const parts = container.querySelectorAll(`.mantine-${name}-${selector}`);
      expect(parts.length).toBeGreaterThan(0);
      parts.forEach((part) => expect(part).toHaveAttribute('data-test', 'part'));
    }
  });
}
