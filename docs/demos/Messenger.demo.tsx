import { Box, Paper, ScrollArea } from '@mantine/core';
import { MantineDemo } from '@mantinex/demo';
import { Composer, Inbox, ChatMessage, Thread } from 'mantine-messages';
import React, { useState } from 'react';
import { conversations, messages as initialMessages, users } from './data';

const code = `
import { useState } from 'react';
import { Paper, ScrollArea } from '@mantine/core';
import { Composer, Inbox, Thread } from 'mantine-messages';
import { conversations, messages as initialMessages, users } from './data';

function Demo() {
  const [selected, setSelected] = useState('maya');
  const [messages, setMessages] = useState(initialMessages);

  const send = (body: string) =>
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), authorId: 'me', body, createdAt: new Date(), status: 'sent' },
    ]);

  return (
    <Paper withBorder radius="lg" h={520} style={{ display: 'flex', overflow: 'hidden' }}>
      <ScrollArea w={260}>
        <Inbox conversations={conversations} value={selected} onChange={setSelected} />
      </ScrollArea>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Thread messages={messages} users={users} currentUserId="me" style={{ flex: 1 }} />
        <Composer onSend={send} m="sm" />
      </div>
    </Paper>
  );
}
`;

function Demo() {
  const [selected, setSelected] = useState('maya');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const send = (body: string) =>
    setMessages((current) => [
      ...current,
      { id: `new-${current.length}`, authorId: 'me', body, createdAt: new Date(), status: 'sent' },
    ]);

  return (
    <Paper withBorder radius="lg" h={520} style={{ display: 'flex', overflow: 'hidden' }}>
      <ScrollArea w={260} style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>
        <Inbox conversations={conversations} value={selected} onChange={setSelected} />
      </ScrollArea>
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Thread messages={messages} users={users} currentUserId="me" style={{ flex: 1 }} />
        <Composer onSend={send} m="sm" />
      </Box>
    </Paper>
  );
}

export const messenger: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};
