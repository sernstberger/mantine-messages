import { Box, Paper, ScrollArea, Text } from '@mantine/core';
import React, { useRef, useState } from 'react';
import { Composer } from './Composer/Composer';
import { Inbox } from './Inbox/Inbox';
import { sampleConversations, sampleMessages, sampleUsers } from './sample-data';
import { Thread } from './Thread/Thread';
import type { ChatMessage } from './types';

export default { title: 'Messages' };

export function Messenger() {
  const [selected, setSelected] = useState('maya');
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const title = sampleConversations.find((c) => c.id === selected)?.title;

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const count = useRef(0);
  const add = (message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    count.current += 1;
    const id = `new-${count.current}`;
    setMessages((current) => [...current, { ...message, id, createdAt: new Date() }]);
  };

  // Maya answers a moment after you send, so the thread has something to follow
  const send = (body: string) => {
    add({ authorId: 'me', body, status: 'sent', replyToId: replyTo?.id });
    setReplyTo(null);
    setTimeout(
      () => add({ authorId: 'maya', body: replies[count.current % replies.length] }),
      1500
    );
  };

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
          <Thread
            messages={messages}
            users={sampleUsers}
            currentUserId="me"
            onReply={setReplyTo}
            style={{ flex: 1 }}
          />
          <Box p="sm">
            <Composer
              onSend={send}
              replyTo={
                replyTo && {
                  authorName: sampleUsers.find((user) => user.id === replyTo.authorId)!.name,
                  body: replyTo.body,
                }
              }
              onCancelReply={() => setReplyTo(null)}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

const replies = [
  'Got it, thanks!',
  'Perfect, forwarding it to Finance now.',
  'Oh nice, the menu looks great.',
  'Can we do the vegetarian option for 12 of them?',
];

const longThread: ChatMessage[] = Array.from({ length: 80 }, (_, index) => ({
  id: `long-${index}`,
  authorId: index % 3 === 0 ? 'me' : 'maya',
  body: `Message ${index + 1} of 80`,
  createdAt: new Date(Date.now() - (80 - index) * 7 * 60 * 1000),
}));

/** Opens at the newest message. Scroll up, then send: it jumps down because you sent it */
export function LongThread() {
  const [messages, setMessages] = useState(longThread);

  return (
    <Box p="xl" maw={480}>
      <Paper withBorder radius="lg" h={500} style={{ display: 'flex', flexDirection: 'column' }}>
        <Thread messages={messages} users={sampleUsers} currentUserId="me" style={{ flex: 1 }} />
        <Composer
          m="sm"
          onSend={(body) =>
            setMessages((current) => [
              ...current,
              { id: `long-new-${current.length}`, authorId: 'me', body, createdAt: new Date() },
            ])
          }
        />
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
