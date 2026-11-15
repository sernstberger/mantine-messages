import { ScrollArea } from '@mantine/core';
import { MantineDemo } from '@mantinex/demo';
import {
  ChatMessage,
  ChatThread,
  Composer,
  ComposerDraft,
  Inbox,
  MessagesShell,
} from 'mantine-messages';
import React, { useState } from 'react';
import { conversations, messages as initialMessages, users } from './data';

const code = `
import { useState } from 'react';
import { ScrollArea } from '@mantine/core';
import { ChatThread, Composer, Inbox, MessagesShell, type ComposerDraft } from 'mantine-messages';
import { conversations, messages as initialMessages, users } from './data';

function Demo() {
  const [selected, setSelected] = useState('maya');
  const [messages, setMessages] = useState(initialMessages);

  const send = ({ text: body }: ComposerDraft) =>
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), authorId: 'me', body, createdAt: new Date(), status: 'sent' },
    ]);

  return (
    <MessagesShell withBorder radius="lg" h={520}>
      <MessagesShell.List w={260} aria-label="Conversations">
        <ScrollArea style={{ flex: 1 }}>
          <Inbox conversations={conversations} value={selected} onChange={setSelected} />
        </ScrollArea>
      </MessagesShell.List>
      <MessagesShell.Main aria-label="Conversation">
        <ChatThread messages={messages} users={users} currentUserId="me" style={{ flex: 1 }} />
        <Composer onSend={send} m="sm" />
      </MessagesShell.Main>
    </MessagesShell>
  );
}
`;

function Demo() {
  const [selected, setSelected] = useState('maya');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const send = ({ text: body }: ComposerDraft) =>
    setMessages((current) => [
      ...current,
      { id: `new-${current.length}`, authorId: 'me', body, createdAt: new Date(), status: 'sent' },
    ]);

  return (
    <MessagesShell withBorder radius="lg" h={520}>
      <MessagesShell.List w={260} aria-label="Conversations">
        <ScrollArea style={{ flex: 1 }}>
          <Inbox conversations={conversations} value={selected} onChange={setSelected} />
        </ScrollArea>
      </MessagesShell.List>
      <MessagesShell.Main aria-label="Conversation">
        <ChatThread messages={messages} users={users} currentUserId="me" style={{ flex: 1 }} />
        <Composer onSend={send} m="sm" />
      </MessagesShell.Main>
    </MessagesShell>
  );
}

export const messenger: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};
