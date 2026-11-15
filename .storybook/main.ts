import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, join } from 'path';
import { mergeConfig } from 'vite';
import { repoStaticDirs, repoViteConfig } from './repo-vite';

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: ['../package/src/**/*.story.@(js|jsx|mjs|ts|tsx)'],
  staticDirs: repoStaticDirs,
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
  viteFinal: (viteConfig) =>
    mergeConfig(
      mergeConfig(viteConfig, {
        build: {
          // The chunks over Vite's 500 kB default are third-party modules that already load on
          // demand (Storybook's docs renderer and the like): nothing left to split
          chunkSizeWarningLimit: 1500,
          rollupOptions: {
            onwarn(warning, warn) {
              // Storybook's own preview runtime uses eval; that is Storybook's code, not ours
              if (warning.code === 'EVAL' && warning.id?.includes('/@storybook/core/')) {
                return;
              }
              warn(warning);
            },
          },
        },
      }),
      repoViteConfig
    ),
};

export default config;
