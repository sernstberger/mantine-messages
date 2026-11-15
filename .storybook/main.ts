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
  // Telemetry also prints a notice and spawns the package manager during builds
  core: { disableTelemetry: true },
  // The work-queue example in docs/demos imports 'mantine-messages' as an app does. Point that
  // at the source, so its story needs no build and gets the package's CSS modules. Only the bare
  // name: subpaths such as 'mantine-messages/markdown' are not aliased
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      build: {
        // The chunks over Vite's 500 kB default are Storybook's own docs renderer, loaded on demand
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          onwarn(warning, warn) {
            if (warning.code === 'EVAL' && warning.id?.includes('/@storybook/core/')) {
              return;
            }
            warn(warning);
          },
        },
      },
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
