import { resolve } from 'path';
import type { UserConfig } from 'vite';

/** This repo's part of the shared main.ts (templates/storybook/main.ts in mantine-lib-harness) */
export const repoStaticDirs: string[] = [];

export const repoViteConfig: UserConfig = {
  resolve: {
    // The work-queue example imports 'mantine-messages' by name, as an app would
    alias: [
      {
        find: /^mantine-messages$/,
        replacement: resolve(__dirname, '../package/src/index.ts'),
      },
    ],
  },
};
