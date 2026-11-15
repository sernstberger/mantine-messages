import { Box } from '@mantine/core';
import React from 'react';
import { MessageActions } from './MessageActions';

export default { title: 'MessageActions' };

export function Usage() {
  return (
    <Box p="xl">
      <MessageActions
        actions={['reply', 'react', 'copy']}
        text="Did the venue confirm for Saturday?"
        author="Maya Lindqvist"
        onReply={() => {}}
        onReact={() => {}}
      />
    </Box>
  );
}
