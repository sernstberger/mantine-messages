import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, join, resolve } from 'path';
import { mergeConfig } from 'vite';

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: ['../package/src/**/*.story.@(js|jsx|mjs|ts|tsx)'],
  addons: [getAbsolutePath('@storybook/addon-essentials')],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  docs: {
    autodocs: false,
  },
  // The work-queue example in docs/demos imports 'mantine-messages' as an app does. Point that
  // at the source, so its story needs no build and gets the package's CSS modules. Only the bare
  // name: subpaths such as 'mantine-messages/markdown' are not aliased
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: {
        alias: [
          {
            find: /^mantine-messages$/,
            replacement: resolve(__dirname, '../package/src/index.ts'),
          },
        ],
      },
    }),
};

export default config;
