import { Box } from '@mantine/core';
import React from 'react';
// The example app lives in the docs; .storybook/main.ts points its 'mantine-messages' imports here
import { WorkQueue } from '../../docs/demos/WorkQueue/WorkQueue';

export default { title: 'Work queue' };

export function Queue() {
  return (
    <Box p="md">
      <WorkQueue h={720} />
    </Box>
  );
}

export function OpenTicket() {
  return (
    <Box p="md">
      <WorkQueue h={720} defaultTicketId="T-1042" />
    </Box>
  );
}
