import { Box, Button, Paper, Text } from '@mantine/core';
import React, { useState } from 'react';
import { ChatThread } from './ChatThread';
import { Composer } from '../Composer/Composer';
import { sampleMessages, sampleUsers } from '../sample-data';
import { MarkdownBody } from '../MarkdownBody/MarkdownBody';
import type { ChatMessage } from '../types';
import { MarkdownAdapterProvider } from '../MarkdownBody/MarkdownAdapterProvider';
import { markdownAdapter } from '../../../.storybook/markdown-adapter';

export default {
  title: 'ChatThread',
  decorators: [
    (Story: React.ComponentType) => (
      <MarkdownAdapterProvider adapter={markdownAdapter}>
        <Story />
      </MarkdownAdapterProvider>
    ),
  ],
};

export function Usage() {
  return (
    <Box p="xl" maw={480}>
      <ChatThread messages={sampleMessages} users={sampleUsers} currentUserId="me" />
    </Box>
  );
}

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
              {
                id: `long-new-${current.length}`,
                authorId: 'me',
                body,
                createdAt: new Date(),
              },
            ])
          }
        />
      </Paper>
    </Box>
  );
}

const now = Date.now();

const markdownMessages: ChatMessage[] = [
  {
    id: 'md1',
    authorId: 'maya',
    format: 'markdown',
    createdAt: new Date(now - 6 * 60 * 1000),
    body: 'Agenda for **Saturday**:\n\n1. Venue walk-through at 10\n2. Menu tasting, see [the menu](https://example.com/menu)\n3. Seating plan',
  },
  {
    id: 'md2',
    authorId: 'me',
    format: 'markdown',
    createdAt: new Date(now - 4 * 60 * 1000),
    status: 'read',
    body: 'Looks good. Tables for the plan, from `seat.ts`:\n\n```ts\nconst tables = Math.ceil(guests.length / 8);\n```',
  },
  {
    id: 'md3',
    authorId: 'maya',
    createdAt: new Date(now - 2 * 60 * 1000),
    body: 'Plain text messages keep their *asterisks*.',
  },
];

/** Markdown messages through renderBody and MarkdownBody; plain ones stay plain */
export function WithMarkdown() {
  return (
    <Box p="xl" maw={520}>
      <Paper withBorder radius="lg" h={520} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={markdownMessages}
          users={sampleUsers}
          currentUserId="me"
          style={{ flex: 1 }}
          renderBody={(message) =>
            message.format === 'markdown' ? (
              <MarkdownBody>{message.body}</MarkdownBody>
            ) : (
              message.body
            )
          }
        />
      </Paper>
    </Box>
  );
}

const customChatMessages: ChatMessage[] = [
  ...sampleMessages,
  {
    id: 'm8',
    authorId: 'me',
    format: 'markdown',
    body: 'Menu options are **A** or **B**, see the invoice.',
    createdAt: new Date(now - 60 * 1000),
    status: 'failed',
  },
];

/** renderMessage with the parts: markdown bodies, reply and copy only, and Retry on failed messages */
export function Composition() {
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  return (
    <Box p="xl" maw={520}>
      <Paper withBorder radius="lg" h={560} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={customChatMessages}
          users={sampleUsers}
          currentUserId="me"
          style={{ flex: 1 }}
          onReply={setReplyTo}
          renderMessage={(message, context) => (
            <ChatThread.Message message={message} context={context}>
              <ChatThread.Quote />
              <ChatThread.Bubble rightSection={<ChatThread.Actions actions={['reply', 'copy']} />}>
                {message.format === 'markdown' ? (
                  <MarkdownBody>{message.body}</MarkdownBody>
                ) : (
                  message.body
                )}
              </ChatThread.Bubble>
              <ChatThread.Attachments />
              <ChatThread.Reactions />
              <ChatThread.Meta />
              {message.status === 'failed' && (
                <Button variant="light" color="red" size="compact-xs">
                  Retry
                </Button>
              )}
            </ChatThread.Message>
          )}
        />
        {replyTo && (
          <Text size="xs" c="dimmed" px="md" pb="sm">
            Replying to: {replyTo.body}
          </Text>
        )}
      </Paper>
    </Box>
  );
}
