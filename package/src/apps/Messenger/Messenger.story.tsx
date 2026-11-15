import { Box, ScrollArea, Text } from '@mantine/core';
import React, { useRef, useState } from 'react';
import {
  type ChatMessage,
  ChatThread,
  Composer,
  type ComposerDraft,
  Inbox,
  MarkdownAdapterProvider,
  MessagesShell,
} from 'mantine-messages';
import { sampleConversations, sampleMessages, sampleUsers } from '../../sample-data';
import { markdownAdapter } from '../../../../.storybook/markdown-adapter';

export default {
  title: 'Apps/Messenger',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'A direct-message app: conversation list, thread, composer with replies, reactions and attachments.',
      },
    },
  },
  decorators: [
    (Story: React.ComponentType) => (
      <MarkdownAdapterProvider adapter={markdownAdapter}>
        <Story />
      </MarkdownAdapterProvider>
    ),
  ],
};

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
      <MessagesShell withBorder radius="lg" h={600}>
        <MessagesShell.List w={300} aria-label="Conversations">
          <ScrollArea style={{ flex: 1 }}>
            <Inbox conversations={sampleConversations} value={selected} onChange={setSelected} />
          </ScrollArea>
        </MessagesShell.List>
        <MessagesShell.Main aria-label="Conversation">
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
        </MessagesShell.Main>
      </MessagesShell>
    </Box>
  );
}

const replies = [
  'Got it, thanks!',
  'Perfect, forwarding it to Finance now.',
  'Oh nice, the menu looks great.',
  'Can we do the vegetarian option for 12 of them?',
];

/** Same as the title's last part, so Storybook shows the app as one sidebar item */
Messenger.storyName = 'Messenger';
