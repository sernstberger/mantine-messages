import { Box } from '@mantine/core';
import React from 'react';
import { markdownAdapter } from '../../../.storybook/markdown-adapter';
import { MarkdownAdapterProvider } from './MarkdownAdapterProvider';
import { MarkdownBody } from './MarkdownBody';

export default {
  title: 'MarkdownBody',
  decorators: [
    (Story: React.ComponentType) => (
      <MarkdownAdapterProvider adapter={markdownAdapter}>
        <Story />
      </MarkdownAdapterProvider>
    ),
  ],
};

const markdown =
  'Agenda for **Saturday**:\n\n1. Venue walk-through at 10\n2. Menu tasting, see [the menu](https://example.com/menu)\n\n```ts\nconst tables = Math.ceil(guests.length / 8);\n```';

export function Usage() {
  return (
    <Box p="xl" maw={480}>
      <MarkdownBody>{markdown}</MarkdownBody>
    </Box>
  );
}
