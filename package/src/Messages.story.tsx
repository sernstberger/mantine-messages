import { Box, Paper, ScrollArea, Text } from '@mantine/core';
import React, { useState } from 'react';
import { Composer } from './Composer/Composer';
import { Inbox } from './Inbox/Inbox';
import { sampleConversations, sampleMessages, sampleUsers } from './sample-data';
import { Thread } from './Thread/Thread';
import type { Message } from './types';

export default { title: 'Messages' };

export function Messenger() {
  const [selected, setSelected] = useState('maya');
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const title = sampleConversations.find((c) => c.id === selected)?.title;

  const send = (body: string) =>
    setMessages((current) => [
      ...current,
      { id: `new-${current.length}`, authorId: 'me', body, createdAt: new Date(), status: 'sent' },
    ]);

  return (
    <Box p="xl">
      <Paper withBorder radius="lg" h={600} style={{ display: 'flex', overflow: 'hidden' }}>
        <ScrollArea
          w={300}
          style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}
        >
          <Inbox conversations={sampleConversations} value={selected} onChange={setSelected} />
        </ScrollArea>
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Text
            fw={600}
            px="md"
            py="sm"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            {title}
          </Text>
          <ScrollArea style={{ flex: 1 }}>
            <Thread messages={messages} users={sampleUsers} currentUserId="me" />
          </ScrollArea>
          <Box p="sm">
            <Composer onSend={send} />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export function ThreadOnly() {
  return (
    <Box p="xl" maw={480}>
      <Thread messages={sampleMessages} users={sampleUsers} currentUserId="me" />
    </Box>
  );
}

export function InboxOnly() {
  return (
    <Box p="xl" maw={360}>
      <Inbox conversations={sampleConversations} defaultValue="maya" />
    </Box>
  );
}

export function EmptyInbox() {
  return (
    <Box p="xl" maw={360}>
      <Inbox conversations={[]} />
    </Box>
  );
}
