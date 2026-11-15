import { Box } from '@mantine/core';
import React from 'react';
// The example app lives in the docs; .storybook/main.ts points its 'mantine-messages' imports here
import { WorkQueue as App } from '../../../../docs/demos/WorkQueue/WorkQueue';

export default {
  title: 'Apps/WorkQueue',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'A support work queue, table layout: a triage table with filters, sorting and bulk actions, and a ticket view with Reply and Internal note.',
      },
    },
  },
};

export function WorkQueue() {
  return (
    <Box p="md">
      <App h={720} />
    </Box>
  );
}

/** Same as the title's last part, so Storybook shows the app as one sidebar item */
WorkQueue.storyName = 'WorkQueue';
