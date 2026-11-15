import type React from 'react';

interface Options {
  component: React.ComponentType<any>;
}

/**
 * `varsResolver: true` of `tests.itSupportsSystemProps` in the Mantine repo; the published
 * @mantine-tests/core 2.1.0 does not have the option yet
 */
export function itHasStaticVarsResolver(options: Options, name = 'has static vars resolver') {
  it(name, () => {
    const { varsResolver } = options.component as any;
    expect(typeof varsResolver === 'function').toBe(true);
  });
}
