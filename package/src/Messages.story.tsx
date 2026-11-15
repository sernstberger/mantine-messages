import { Box, Paper, ScrollArea, Text } from '@mantine/core';
import React, { useRef, useState } from 'react';
import { Composer, type ComposerDraft, type ComposerMode } from './Composer/Composer';
import { Inbox } from './Inbox/Inbox';
import { MarkdownBody } from './MarkdownBody/MarkdownBody';
import { MessagesShell } from './MessagesShell/MessagesShell';
import {
  sampleChannels,
  sampleConversations,
  sampleMessages,
  sampleTeamItems,
  sampleUsers,
} from './sample-data';
import { ChatThread } from './ChatThread/ChatThread';
import { TeamThread, type TeamThreadItem } from './TeamThread/TeamThread';
import { ThreadPanel } from './ThreadPanel/ThreadPanel';
import type { ChatMessage, Conversation } from './types';
import { MarkdownAdapterProvider } from './MarkdownBody/MarkdownAdapterProvider';
import { markdownAdapter } from '../../.storybook/markdown-adapter';

export default {
  title: 'Messages',
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

const teamModes: ComposerMode[] = [
  { value: 'message', label: 'Message' },
  {
    value: 'note',
    label: 'Internal note',
    color: 'yellow',
    note: true,
    placeholder: 'Only teammates see internal notes',
  },
];

const isMessage = (item: TeamThreadItem): item is ChatMessage => !('kind' in item);
const nameOf = (conversation: Conversation) =>
  conversation.kind === 'channel' ? `#${conversation.title}` : conversation.title;

const firstItems = (conversation: Conversation): TeamThreadItem[] =>
  conversation.id === 'launch'
    ? sampleTeamItems
    : [
        {
          id: `start-${conversation.id}`,
          kind: 'event',
          authorId: 'me',
          text: `This is the very beginning of ${nameOf(conversation)}`,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ];

/** Slack-style: channels with sections and search, a channel, and a thread beside it */
const channelTopics: Record<string, string> = {
  launch: 'Ship it Thursday',
  general: 'Announcements and anything for the whole company',
  design: 'Crits every Thursday at 2pm',
  random: 'Lunch plans, pets and everything else',
};

export function Team() {
  const [channelId, setChannelId] = useState('launch');
  const [openId, setOpenId] = useState<string | null>(null);
  const [itemsByChannel, setItemsByChannel] = useState<Record<string, TeamThreadItem[]>>(() =>
    Object.fromEntries(
      sampleChannels.map((conversation) => [conversation.id, firstItems(conversation)])
    )
  );
  const count = useRef(0);
  const channel = sampleChannels.find((conversation) => conversation.id === channelId)!;
  const items = itemsByChannel[channelId];
  const messages = items.filter(isMessage);
  const channelItems = items.filter((item) => !isMessage(item) || !item.threadId);
  const parent = messages.find((message) => message.id === openId);
  const replies = messages.filter((message) => message.threadId === openId);

  const update = (change: (current: TeamThreadItem[]) => TeamThreadItem[]) =>
    setItemsByChannel((current) => ({ ...current, [channelId]: change(current[channelId]) }));

  const toggle = (id: string, emoji: string) =>
    update((current) =>
      current.map((item) => {
        if (!isMessage(item) || item.id !== id) {
          return item;
        }

        const reactions = item.reactions ?? [];
        const existing = reactions.find((reaction) => reaction.emoji === emoji);
        const next = existing
          ? reactions.map((reaction) =>
              reaction.emoji === emoji
                ? {
                    ...reaction,
                    userIds: reaction.userIds.includes('me')
                      ? reaction.userIds.filter((userId) => userId !== 'me')
                      : [...reaction.userIds, 'me'],
                  }
                : reaction
            )
          : [...reactions, { emoji, userIds: ['me'] }];

        return { ...item, reactions: next };
      })
    );

  const post = (draft: ComposerDraft, threadId?: string) => {
    count.current += 1;
    const message: ChatMessage = {
      id: `team-new-${count.current}`,
      authorId: 'me',
      body: draft.text,
      createdAt: new Date(),
      threadId,
      visibility: draft.mode === 'note' ? 'internal' : 'public',
    };

    update((current) => [
      ...current.map((item) =>
        isMessage(item) && item.id === threadId
          ? {
              ...item,
              thread: {
                count: (item.thread?.count ?? 0) + 1,
                lastReplyAt: message.createdAt,
                participantIds: Array.from(new Set([...(item.thread?.participantIds ?? []), 'me'])),
              },
            }
          : item
      ),
      message,
    ]);
  };

  const border = '1px solid var(--mantine-color-default-border)';

  return (
    <Box p="xl">
      <MessagesShell
        withBorder
        radius="lg"
        h={640}
        asideOpened={parent !== undefined}
        onAsideOpenedChange={(opened) => !opened && setOpenId(null)}
      >
        <MessagesShell.List w={260} aria-label="Channels">
          <Text fw={800} px="md" py="sm" style={{ borderBottom: border }}>
            Acme
          </Text>
          <ScrollArea style={{ flex: 1 }}>
            <Inbox
              conversations={sampleChannels}
              value={channelId}
              onChange={(id) => {
                setChannelId(id);
                setOpenId(null);
              }}
              withSearch
              sections
            />
          </ScrollArea>
        </MessagesShell.List>
        <MessagesShell.Main aria-label="Channel">
          <Box px="md" py="sm" style={{ borderBottom: border }}>
            <Text fw={700}>{nameOf(channel)}</Text>
            <Text size="xs" c="dimmed">
              {channel.kind === 'channel' ? channelTopics[channel.id] : 'Direct message'}
            </Text>
          </Box>
          <TeamThread
            items={channelItems}
            users={sampleUsers}
            currentUserId="me"
            unreadAfterId={channelId === 'launch' ? 'team-m4' : null}
            selectedId={openId}
            onOpenThread={(message) => setOpenId(message.id)}
            onReact={(message) => toggle(message.id, '👀')}
            onToggleReaction={(message, emoji) => toggle(message.id, emoji)}
            onEdit={() => {}}
            style={{ flex: 1 }}
          />
          <Box p="sm">
            <Composer
              key={channelId}
              modes={teamModes}
              placeholder={`Message ${nameOf(channel)}`}
              onSend={(draft) => post(draft)}
            />
          </Box>
        </MessagesShell.Main>
        {parent && (
          <MessagesShell.Aside w={360} aria-label="Thread">
            <ThreadPanel
              style={{ flex: 1 }}
              parent={parent}
              replies={replies}
              users={sampleUsers}
              currentUserId="me"
              subtitle={nameOf(channel)}
              onClose={() => setOpenId(null)}
              onReact={(message) => toggle(message.id, '👀')}
              onToggleReaction={(message, emoji) => toggle(message.id, emoji)}
            >
              <Composer
                key={parent.id}
                placeholder="Reply…"
                onSend={(draft) => post(draft, parent.id)}
              />
            </ThreadPanel>
          </MessagesShell.Aside>
        )}
      </MessagesShell>
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
export function MarkdownInChat() {
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
