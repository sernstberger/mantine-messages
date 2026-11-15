import { Box } from '@mantine/core';
import React from 'react';
// The example app lives in the docs; .storybook/main.ts points its 'mantine-messages' imports here
import { WorkQueueSplit as App } from '../../../../docs/demos/WorkQueue/WorkQueueSplit';

export default {
  title: 'Apps/WorkQueueSplit',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'A support work queue, split layout: ticket list beside the conversation, with a details sidebar that becomes an overlay when narrow.',
      },
    },
  },
};

export function WorkQueueSplit() {
  return (
    <Box p="md">
      <App h={720} />
    </Box>
  );
}
