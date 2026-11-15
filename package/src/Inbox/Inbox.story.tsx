import { Box } from '@mantine/core';
import React from 'react';
import { Inbox } from './Inbox';
import { sampleConversations } from '../sample-data';

export default { title: 'Inbox' };

export function Usage() {
  return (
    <Box p="xl" maw={360}>
      <Inbox conversations={sampleConversations} defaultValue="maya" />
    </Box>
  );
}

export function Empty() {
  return (
    <Box p="xl" maw={360}>
      <Inbox conversations={[]} />
    </Box>
  );
}
