import { Box, Paper, Text } from '@mantine/core';
import React from 'react';
import { sampleMessages } from '../sample-data';
import type { ChatMessage } from '../types';
import { MessageList } from './MessageList';

export default { title: 'MessageList' };

const renderItem = (item: ChatMessage) => (
  <Text size="sm" px="md" py={4}>
    {item.body}
  </Text>
);

export function Usage() {
  return (
    <Box p="xl" maw={480}>
      <Paper withBorder radius="lg" h={420} style={{ display: 'flex', flexDirection: 'column' }}>
        <MessageList items={sampleMessages} renderItem={renderItem} style={{ flex: 1 }} />
      </Paper>
    </Box>
  );
}
