import { Box, Text } from '@mantine/core';
import {
  Message,
  MessageList,
  type ChatMessage,
  type MessageListControl,
  type MessagesUser,
} from 'mantine-messages';
import React from 'react';
import { EmailCard } from './EmailCard';
import { nameGetter } from './queue';
import type { EmailItem, TimelineItem } from './types';

export interface TicketTimelineProps {
  items: TimelineItem[];
  users: MessagesUser[];

  /** Lets the ticket sidebar jump to an item and flash it */
  controlRef?: React.Ref<MessageListControl>;
  onOpenEmail: (email: EmailItem) => void;
}

const time = (item: TimelineItem) =>
  new Date(item.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Emails, chat, internal notes and events of one ticket, in one list */
export function TicketTimeline({ items, users, controlRef, onOpenEmail }: TicketTimelineProps) {
  const nameOf = nameGetter(users);

  const renderMessage = (message: ChatMessage) => {
    const note = message.visibility === 'internal';

    return (
      <Message
        p="xs"
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          ...(note && {
            backgroundColor: 'var(--mantine-color-yellow-light)',
            boxShadow: 'inset 3px 0 0 var(--mantine-color-yellow-filled)',
          }),
        }}
        mod={{ note }}
      >
        <Message.Avatar name={nameOf(message.authorId)} />
        <Message.Body>
          <Message.Meta>
            <Text component="span" size="sm" fw={700}>
              {nameOf(message.authorId)}
            </Text>
            <Text component="span" size="xs" c="dimmed">
              {note ? 'Internal note' : 'Chat'} · {time(message)}
            </Text>
          </Message.Meta>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {message.body}
          </Text>
        </Message.Body>
      </Message>
    );
  };

  const renderItem = (item: TimelineItem) => {
    if (!('kind' in item)) {
      return renderMessage(item);
    }

    if (item.kind === 'email') {
      return <EmailCard email={item} time={time(item)} onOpen={onOpenEmail} />;
    }

    return (
      <Text size="xs" c="dimmed" ta="center">
        {item.text} · {time(item)}
      </Text>
    );
  };

  return (
    <MessageList<TimelineItem>
      items={items}
      controlRef={controlRef}
      isOwn={(item) => item.authorId === 'me'}
      style={{ flex: 1, minHeight: 0 }}
      renderItem={(item, { highlighted }) => (
        <Box
          py={4}
          px="md"
          mod={{ highlighted }}
          style={{
            transition: 'background-color 300ms',
            backgroundColor: highlighted ? 'var(--mantine-primary-color-light)' : undefined,
          }}
        >
          {renderItem(item)}
        </Box>
      )}
    />
  );
}
