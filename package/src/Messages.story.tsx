import { Box, Paper, ScrollArea, Text } from '@mantine/core';
import React, { useRef, useState } from 'react';
import { Composer, type ComposerDraft } from './Composer/Composer';
import { Inbox } from './Inbox/Inbox';
import { sampleConversations, sampleMessages, sampleUsers } from './sample-data';
import { ChatThread } from './ChatThread/ChatThread';
import type { ChatMessage } from './types';

export default { title: 'Messages' };

export function Messenger() {
  const [selected, setSelected] = useState('maya');
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const title = sampleConversations.find((c) => c.id === selected)?.title;

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const toggle = (id: string, emoji: string) =>
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== id) {
          return message;
        }

        const reactions = message.reactions ?? [];
        const existing = reactions.find((reaction) => reaction.emoji === emoji);
        const next = existing
          ? reactions.map((reaction) =>
              reaction.emoji === emoji
                ? {
                    ...reaction,
                    userIds: reaction.userIds.includes('me')
                      ? reaction.userIds.filter((id) => id !== 'me')
                      : [...reaction.userIds, 'me'],
                  }
                : reaction
            )
          : [...reactions, { emoji, userIds: ['me'] }];

        return { ...message, reactions: next };
      })
    );
  const count = useRef(0);
  const add = (message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    count.current += 1;
    const id = `new-${count.current}`;
    setMessages((current) => [...current, { ...message, id, createdAt: new Date() }]);
  };

  // Maya answers a moment after you send, so the thread has something to follow
  const send = ({ text: body }: ComposerDraft) => {
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
          <ChatThread
            messages={messages}
            users={sampleUsers}
            currentUserId="me"
            onReply={setReplyTo}
            onReact={(message) => toggle(message.id, '❤️')}
            onToggleReaction={(message, emoji) => toggle(message.id, emoji)}
            unreadAfterId="m4"
            style={{ flex: 1 }}
          />
          <Box p="sm">
            <Composer
              onSend={send}
              replyTo={
                replyTo && {
                  id: replyTo.id,
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

/** Opens at the newest message; scroll to the top to load older ones, 20 at a time */
export function LongThread() {
  const [count, setCount] = useState(40);
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState<ChatMessage[]>([]);
  const messages = [...longThread.slice(longThread.length - count), ...extra];

  const loadOlder = () => {
    setLoading(true);
    setTimeout(() => {
      setCount((current) => Math.min(current + 20, longThread.length));
      setLoading(false);
    }, 800);
  };

  return (
    <Box p="xl" maw={480}>
      <Paper withBorder radius="lg" h={500} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={messages}
          users={sampleUsers}
          currentUserId="me"
          style={{ flex: 1 }}
          onLoadOlder={loadOlder}
          hasOlder={count < longThread.length}
          loadingOlder={loading}
        />
        <Composer
          m="sm"
          onSend={({ text: body }) =>
            setExtra((current) => [
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
      <ChatThread messages={sampleMessages} users={sampleUsers} currentUserId="me" />
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
