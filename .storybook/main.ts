// Deviation: @storybook/react-vite, not Mantine's @storybook/nextjs (a library on Vite, not a Next app)
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { repoStaticDirs, repoViteConfig } from './repo-vite.ts';

const config: StorybookConfig = {
  core: {
    disableWhatsNewNotifications: true,
    disableTelemetry: true,
    enableCrashReports: false,
  },
  features: {
    sidebarOnboardingChecklist: false,
  },
  // Deviation: one package, so one glob (Mantine globs packages/@mantine/* and filters by COMPONENT)
  stories: ['../package/src/**/*.story.@(ts|tsx)'],
  // Deviation: the repo's static files, from repo-vite.ts (Mantine has none)
  staticDirs: repoStaticDirs,
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  // Deviation: Vite instead of webpackFinal; the build stays silent and the repo adds its own config
  viteFinal: (viteConfig) =>
    mergeConfig(
      mergeConfig(viteConfig, {
        // Vite lists every chunk otherwise; warnings still print
        logLevel: 'warn',
        build: {
          // The preview entry (Storybook's runtime, React, Mantine) is over Vite's 500 kB default;
          // Storybook loads it from disk, so splitting it would gain nothing
          chunkSizeWarningLimit: 1500,
        },
      }),
      repoViteConfig
    ),
};

export default config;
