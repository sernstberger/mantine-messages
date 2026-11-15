import { Box, Group, ScrollArea, Stack, Text } from '@mantine/core';
import React, { useState } from 'react';
import { ChatThread } from '../ChatThread/ChatThread';
import { Composer } from '../Composer/Composer';
import { Inbox } from '../Inbox/Inbox';
import { MessagesShell } from './MessagesShell';
import { sampleConversations, sampleMessages, sampleUsers } from '../sample-data';

export default { title: 'MessagesShell' };

const border = '1px solid var(--mantine-color-default-border)';

function Shell({ width }: { width?: number }) {
  const [selected, setSelected] = useState('maya');
  const conversation = sampleConversations.find((c) => c.id === selected)!;

  return (
    <div style={{ padding: 40, width }}>
      <MessagesShell withBorder radius="lg" h={600}>
        <MessagesShell.List aria-label="Conversations">
          <ScrollArea style={{ flex: 1 }}>
            <Inbox conversations={sampleConversations} value={selected} onChange={setSelected} />
          </ScrollArea>
        </MessagesShell.List>
        <MessagesShell.Main aria-label="Conversation">
          <Group px="md" py="sm" justify="space-between" style={{ borderBottom: border }}>
            <Text fw={600}>{conversation.title}</Text>
            <MessagesShell.AsideToggle />
          </Group>
          <ChatThread
            messages={sampleMessages}
            users={sampleUsers}
            currentUserId="me"
            style={{ flex: 1 }}
          />
          <Box p="sm">
            <Composer />
          </Box>
        </MessagesShell.Main>
        <MessagesShell.Aside>
          <Stack p="md" gap="xs">
            <Text fw={700}>{conversation.title}</Text>
            <Text size="sm" c="dimmed">
              Shared files, members and settings go here. Below 960px of the shell this pane hides
              behind the Details button and opens over the conversation.
            </Text>
          </Stack>
        </MessagesShell.Aside>
      </MessagesShell>
    </div>
  );
}

export function Usage() {
  return <Shell />;
}

export function Narrow() {
  return <Shell width={800} />;
}
