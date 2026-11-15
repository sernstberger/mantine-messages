import type { Decorator } from '@storybook/react-vite';
import { createTheme } from '@mantine/core';

/**
 * This repo's part of the shared preview (templates/storybook/preview.tsx in mantine-lib-harness):
 * the theme, decorators that run before the shared one (as Mantine's CodeHighlight and Modals
 * decorators do), and side-effect imports such as self-hosted fonts. Stories that show markdown
 * add the markdown adapter themselves, so others render plain text.
 */
export const repoTheme = createTheme({});

export const repoDecorators: Decorator[] = [];
