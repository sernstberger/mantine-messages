import { Box, ScrollArea, Text } from '@mantine/core';
import React, { useRef, useState } from 'react';
import { Composer, type ComposerDraft, type ComposerMode } from './Composer/Composer';
import { Inbox } from './Inbox/Inbox';
import { MessagesShell } from './MessagesShell/MessagesShell';
import { sampleChannels, sampleTeamItems, sampleUsers } from './sample-data';
import { TeamThread, type TeamThreadItem } from './TeamThread/TeamThread';
import { ThreadPanel } from './ThreadPanel/ThreadPanel';
import type { ChatMessage, Conversation } from './types';
import { MarkdownAdapterProvider } from './MarkdownBody/MarkdownAdapterProvider';
import { markdownAdapter } from '../../.storybook/markdown-adapter';

export default {
  title: 'Team',
  decorators: [
    (Story: React.ComponentType) => (
      <MarkdownAdapterProvider adapter={markdownAdapter}>
        <Story />
      </MarkdownAdapterProvider>
    ),
  ],
};

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
          <MessagesShell.Aside w={360} aria-label="Thread pane">
            <ThreadPanel
              style={{ flex: 1 }}
              subtitle={nameOf(channel)}
              onClose={() => setOpenId(null)}
            >
              <ThreadPanel.Replies
                parent={parent}
                replies={replies}
                users={sampleUsers}
                currentUserId="me"
                onReact={(message) => toggle(message.id, '👀')}
                onToggleReaction={(message, emoji) => toggle(message.id, emoji)}
              />
              <ThreadPanel.Footer>
                <Composer
                  key={parent.id}
                  placeholder="Reply…"
                  onSend={(draft) => post(draft, parent.id)}
                />
              </ThreadPanel.Footer>
            </ThreadPanel>
          </MessagesShell.Aside>
        )}
      </MessagesShell>
    </Box>
  );
}
