# Storybook for a Mantine lib (as Mantine's own, 9.8.0)

`main.ts` and `preview.tsx` are Mantine's `.storybook/main.ts` and `.storybook/preview.tsx` at
tag 9.8.0, line by line, with each deviation marked by a `// Deviation:` comment. Every lib on
the harness copies them byte-identical; what differs per repo lives in two files of its own.

| File | Goes to | Changes per repo |
| --- | --- | --- |
| `main.ts` | `.storybook/main.ts` | none |
| `preview.tsx` | `.storybook/preview.tsx` | none |
| `repo-vite.ts` (write it) | `.storybook/repo-vite.ts` | `repoStaticDirs`, `repoViteConfig` (aliases, plugins) |
| `repo.tsx` (write it) | `.storybook/repo.tsx` | `repoTheme`, `RepoProviders`, side-effect imports (fonts) |

## Apply

1. Copy `main.ts` and `preview.tsx` into `.storybook/` unchanged. The harness check compares
   their hashes with the templates.
2. Write `.storybook/repo-vite.ts`. It is loaded as ESM: no `__dirname` or `require`, so derive
   paths from `import.meta.url`:
   ```ts
   import path from 'node:path';
   import { fileURLToPath } from 'node:url';
   import type { UserConfig } from 'vite';

   const __dirname = path.dirname(fileURLToPath(import.meta.url));

   export const repoStaticDirs: string[] = [];
   export const repoViteConfig: UserConfig = {};
   ```
3. Write `.storybook/repo.tsx`:
   ```tsx
   import { createTheme } from '@mantine/core';
   import React from 'react';

   export const repoTheme = createTheme({});

   export function RepoProviders({ children }: { children: React.ReactNode }) {
     return <>{children}</>;
   }
   ```
4. Dev dependencies, the same ranges as Mantine 9.8.0, and no addons (Storybook 10 has the
   essentials built in):
   ```bash
   yarn remove @storybook/addon-essentials @storybook/preview-api @storybook/react
   yarn add -D storybook@^10.6.3 @storybook/react-vite@^10.6.3 @phosphor-icons/react@^2.1.10
   ```
   Stories that import from `@storybook/*` move to `storybook/*` (`storybook/preview-api`,
   `storybook/test`), as Mantine's do.
5. `package.json`: `"storybook:build": "storybook build -o storybook-static --quiet --loglevel warn"`
   (silent unless something warns).
6. If `tsconfig.json` includes `harness`, add `"exclude": ["harness/storybook"]`: the staged
   copies import `./repo-vite.ts` and `./repo`, which live only in `.storybook/`.

## Stories

The preview sets `layout: 'fullscreen'`, as Mantine's does, so stories place themselves:

- **Component stories** pad themselves the way Mantine's do, with a plain `div` around the story:
  `<div style={{ padding: 40 }}>`, plus `maxWidth` when the component needs a column
  (`<div style={{ padding: 40, maxWidth: 480 }}>`). A fixed height on the component inside is
  fine where it shows scrolling.
- **Apps** (`Apps/<Name>`) are full-bleed and fill the viewport: the app root takes
  `h="100dvh"` (or `min-height: 100dvh` for a page that scrolls as a whole), no outer padding, no
  border or radius, never a fixed `h={720}` or `600px`. Keep `<Name>.storyName = '<Name>'`.

See `storybook.md` in the mantine-lib-harness skill for titles, names and the sort.
