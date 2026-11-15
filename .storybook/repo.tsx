import { createTheme } from '@mantine/core';
import React from 'react';

/**
 * This repo's part of the shared preview (templates/storybook/preview.tsx in mantine-lib-harness):
 * the theme, providers every story needs, and side-effect imports such as self-hosted fonts.
 * Stories that show markdown add the markdown adapter themselves, so others render plain text.
 */
export const repoTheme = createTheme({});

export function RepoProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
