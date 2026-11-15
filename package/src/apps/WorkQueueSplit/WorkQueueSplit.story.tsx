import React from 'react';
// The example app lives in the docs; .storybook/repo-vite.ts points its 'mantine-messages' imports here
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
  return <App h="100dvh" withBorder={false} radius={0} />;
}

/** Same as the title's last part, so Storybook shows the app as one sidebar item */
WorkQueueSplit.storyName = 'WorkQueueSplit';
